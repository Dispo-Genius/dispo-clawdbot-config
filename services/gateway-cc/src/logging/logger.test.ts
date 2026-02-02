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

describe('logger', () => {
  beforeEach(() => {
    memDb = createMigratedDb();
  });

  it('inserts log entry with all fields', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    logExecution('my-svc', 'analyze', 0, 1500);
    const logs = queryUsage();
    expect(logs).toHaveLength(1);
    expect(logs[0].service).toBe('my-svc');
    expect(logs[0].command).toBe('analyze');
    expect(logs[0].exit_code).toBe(0);
    expect(logs[0].duration_ms).toBe(1500);
  });

  it('handles null exit_code and duration', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    logExecution('my-svc', 'status', null, null);
    const logs = queryUsage();
    expect(logs[0].exit_code).toBeNull();
    expect(logs[0].duration_ms).toBeNull();
  });

  it('auto-sets created_at', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    logExecution('my-svc', 'run', 0, 100);
    const logs = queryUsage();
    expect(logs[0].created_at).toBeTruthy();
    // Should be a valid datetime string
    expect(new Date(logs[0].created_at).getTime()).not.toBeNaN();
  });

  it('filters by service', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    logExecution('svc-a', 'cmd1', 0, 100);
    logExecution('svc-b', 'cmd2', 0, 200);
    logExecution('svc-a', 'cmd3', 0, 300);

    const filtered = queryUsage('svc-a');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((l) => l.service === 'svc-a')).toBe(true);
  });

  it('returns all when no filter', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    logExecution('svc-a', 'cmd1', 0, 100);
    logExecution('svc-b', 'cmd2', 0, 200);

    const all = queryUsage();
    expect(all).toHaveLength(2);
  });

  it('respects limit param', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    for (let i = 0; i < 10; i++) {
      logExecution('svc', `cmd-${i}`, 0, i * 100);
    }
    const limited = queryUsage(undefined, 3);
    expect(limited).toHaveLength(3);
  });

  it('returns in descending order by created_at', async () => {
    const { logExecution, queryUsage } = await import('./logger');
    logExecution('svc', 'first', 0, 100);
    logExecution('svc', 'second', 0, 200);
    logExecution('svc', 'third', 0, 300);

    const logs = queryUsage();
    // Most recent should be first (higher id = later insert within same second)
    expect(logs[0].command).toBe('third');
    expect(logs[2].command).toBe('first');
  });
});
