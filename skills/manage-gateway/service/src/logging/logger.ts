import { getDb } from '../db/migrate';

export interface UsageLogEntry {
  id: number;
  service: string;
  command: string;
  exit_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

export function logExecution(
  service: string,
  command: string,
  exitCode: number | null,
  durationMs: number | null,
  clientId?: string
): void {
  const db = getDb();
  // clientId is logged for future use but not stored in current schema
  db.prepare(
    'INSERT INTO usage_logs (service, command, exit_code, duration_ms) VALUES (?, ?, ?, ?)'
  ).run(service, command, exitCode, durationMs);
}

export function queryUsage(
  service?: string,
  limit: number = 20
): UsageLogEntry[] {
  const db = getDb();
  if (service) {
    return db
      .prepare(
        'SELECT * FROM usage_logs WHERE service = ? ORDER BY created_at DESC LIMIT ?'
      )
      .all(service, limit) as UsageLogEntry[];
  }
  return db
    .prepare('SELECT * FROM usage_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit) as UsageLogEntry[];
}
