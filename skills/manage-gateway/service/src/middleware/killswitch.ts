import { getDb } from '../db/migrate';

export interface KillSwitchState {
  service: string;
  active: boolean;
  reason: string | null;
  updatedAt: string;
}

/** Returns true if the service (or global) kill switch is active. */
export function isKilled(service: string): { killed: boolean; reason: string | null } {
  const db = getDb();

  // Check service-specific kill switch
  const row = db
    .prepare('SELECT active, reason FROM kill_switch WHERE service = ?')
    .get(service) as { active: number; reason: string | null } | undefined;

  if (row && row.active) {
    return { killed: true, reason: row.reason };
  }

  // Check global kill switch
  const global = db
    .prepare('SELECT active, reason FROM kill_switch WHERE service = ?')
    .get('__global__') as { active: number; reason: string | null } | undefined;

  if (global && global.active) {
    return { killed: true, reason: global.reason };
  }

  return { killed: false, reason: null };
}

export function activateKillSwitch(service: string, reason: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO kill_switch (service, active, reason, updated_at)
     VALUES (?, 1, ?, datetime('now'))
     ON CONFLICT(service) DO UPDATE SET active = 1, reason = excluded.reason, updated_at = datetime('now')`
  ).run(service, reason);
}

export function deactivateKillSwitch(service: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE kill_switch SET active = 0, reason = NULL, updated_at = datetime('now') WHERE service = ?`
  ).run(service);
}

export function getKillSwitchStates(): KillSwitchState[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT service, active, reason, updated_at FROM kill_switch')
    .all() as { service: string; active: number; reason: string | null; updated_at: string }[];

  return rows.map((r) => ({
    service: r.service,
    active: r.active === 1,
    reason: r.reason,
    updatedAt: r.updated_at,
  }));
}
