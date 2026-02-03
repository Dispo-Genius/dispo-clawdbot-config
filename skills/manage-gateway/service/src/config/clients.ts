import { getDb } from '../db/migrate';

/**
 * Client configuration is now handled via 1Password service accounts.
 * The service account token IS the authentication - no separate client registry needed.
 *
 * This module provides:
 * - Client kill switches (admin can disable clients)
 * - Legacy support for registered clients (database-backed)
 */

// --- Client-level kill switches (stored in DB) ---

export function isClientKilled(clientId: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT active FROM kill_switch WHERE service = ?')
    .get(`client:${clientId}`) as { active: number } | undefined;
  return row?.active === 1;
}

export function killClient(clientId: string, reason: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO kill_switch (service, active, reason, updated_at)
     VALUES (?, 1, ?, datetime('now'))
     ON CONFLICT(service) DO UPDATE SET active = 1, reason = excluded.reason, updated_at = datetime('now')`
  ).run(`client:${clientId}`, reason);
}

export function resumeClient(clientId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE kill_switch SET active = 0, reason = NULL, updated_at = datetime('now') WHERE service = ?`
  ).run(`client:${clientId}`);
}

export function getClientKillStates(): Array<{ clientId: string; active: boolean; reason: string | null }> {
  const db = getDb();
  const rows = db
    .prepare("SELECT service, active, reason FROM kill_switch WHERE service LIKE 'client:%'")
    .all() as { service: string; active: number; reason: string | null }[];

  return rows.map((r) => ({
    clientId: r.service.replace('client:', ''),
    active: r.active === 1,
    reason: r.reason,
  }));
}
