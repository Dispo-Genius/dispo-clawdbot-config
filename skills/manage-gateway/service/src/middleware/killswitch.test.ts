import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  USAGE_LOGS_TABLE,
  KILL_SWITCH_TABLE,
  USAGE_LOGS_INDEX,
  USAGE_LOGS_TIME_INDEX,
} from '../db/schema';

function createMigratedDb() {
  const db = new Database(':memory:');
  db.exec(USAGE_LOGS_TABLE);
  db.exec(KILL_SWITCH_TABLE);
  db.exec(USAGE_LOGS_INDEX);
  db.exec(USAGE_LOGS_TIME_INDEX);
  return db;
}

let memDb: Database.Database;

vi.mock('../db/migrate', () => ({
  getDb: () => memDb,
}));

describe('killswitch', () => {
  beforeEach(() => {
    memDb = createMigratedDb();
  });

  it('returns not killed when no kill switch exists', async () => {
    const { isKilled } = await import('./killswitch');
    const result = isKilled('my-service');
    expect(result).toEqual({ killed: false, reason: null });
  });

  it('returns killed when service-specific kill switch is active', async () => {
    const { isKilled, activateKillSwitch } = await import('./killswitch');
    activateKillSwitch('my-service', 'maintenance');
    const result = isKilled('my-service');
    expect(result.killed).toBe(true);
    expect(result.reason).toBe('maintenance');
  });

  it('returns killed when global kill switch is active', async () => {
    const { isKilled, activateKillSwitch } = await import('./killswitch');
    activateKillSwitch('__global__', 'system outage');
    const result = isKilled('any-service');
    expect(result.killed).toBe(true);
    expect(result.reason).toBe('system outage');
  });

  it('does not affect other services when one is killed', async () => {
    const { isKilled, activateKillSwitch } = await import('./killswitch');
    activateKillSwitch('service-a', 'down');
    expect(isKilled('service-a').killed).toBe(true);
    expect(isKilled('service-b').killed).toBe(false);
  });

  it('global kill switch kills all services', async () => {
    const { isKilled, activateKillSwitch } = await import('./killswitch');
    activateKillSwitch('__global__', 'everything down');
    expect(isKilled('service-a').killed).toBe(true);
    expect(isKilled('service-b').killed).toBe(true);
    expect(isKilled('service-c').killed).toBe(true);
  });

  it('activateKillSwitch creates entry', async () => {
    const { activateKillSwitch } = await import('./killswitch');
    activateKillSwitch('new-service', 'testing');
    const row = memDb
      .prepare('SELECT * FROM kill_switch WHERE service = ?')
      .get('new-service') as { active: number; reason: string };
    expect(row.active).toBe(1);
    expect(row.reason).toBe('testing');
  });

  it('re-activate upserts reason', async () => {
    const { activateKillSwitch } = await import('./killswitch');
    activateKillSwitch('svc', 'reason-1');
    activateKillSwitch('svc', 'reason-2');
    const row = memDb
      .prepare('SELECT reason FROM kill_switch WHERE service = ?')
      .get('svc') as { reason: string };
    expect(row.reason).toBe('reason-2');
  });

  it('deactivateKillSwitch clears active and reason', async () => {
    const { activateKillSwitch, deactivateKillSwitch, isKilled } = await import('./killswitch');
    activateKillSwitch('svc', 'going down');
    deactivateKillSwitch('svc');
    expect(isKilled('svc').killed).toBe(false);
    const row = memDb
      .prepare('SELECT active, reason FROM kill_switch WHERE service = ?')
      .get('svc') as { active: number; reason: string | null };
    expect(row.active).toBe(0);
    expect(row.reason).toBeNull();
  });

  it('deactivate non-existent service is a no-op', async () => {
    const { deactivateKillSwitch } = await import('./killswitch');
    // Should not throw
    expect(() => deactivateKillSwitch('ghost')).not.toThrow();
  });

  it('getKillSwitchStates returns all entries with boolean active', async () => {
    const { activateKillSwitch, deactivateKillSwitch, getKillSwitchStates } =
      await import('./killswitch');
    activateKillSwitch('svc-a', 'down');
    activateKillSwitch('svc-b', 'maintenance');
    deactivateKillSwitch('svc-b');

    const states = getKillSwitchStates();
    expect(states).toHaveLength(2);

    const svcA = states.find((s) => s.service === 'svc-a');
    const svcB = states.find((s) => s.service === 'svc-b');
    expect(svcA?.active).toBe(true);
    expect(svcA?.reason).toBe('down');
    expect(svcB?.active).toBe(false);
    expect(svcB?.reason).toBeNull();
  });
});
