import { getDb } from '../db/migrate';

export type Operation = 'read' | 'edit' | 'write' | 'delete';

export interface ActivityInput {
  session_id: string;
  file_path: string;
  operation: Operation;
  branch?: string;
  intent?: string;
}

export interface ActivityRecord extends ActivityInput {
  id: number;
  committed: number;
  commit_hash: string | null;
  created_at: number;
}

export interface ActivityQuery {
  file_path?: string;
  session_id?: string;
  exclude_session?: string;
  since_seconds?: number;
  uncommitted_only?: boolean;
  limit?: number;
}

/**
 * Log a file operation activity.
 */
export function logActivity(input: ActivityInput): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO activity_log (session_id, file_path, operation, branch, intent)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.session_id,
    input.file_path,
    input.operation,
    input.branch ?? null,
    input.intent ?? null
  );
  return result.lastInsertRowid as number;
}

/**
 * Query activity records with filtering.
 */
export function queryActivity(query: ActivityQuery): ActivityRecord[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query.file_path) {
    conditions.push('file_path = ?');
    params.push(query.file_path);
  }

  if (query.session_id) {
    conditions.push('session_id = ?');
    params.push(query.session_id);
  }

  if (query.exclude_session) {
    conditions.push('session_id != ?');
    params.push(query.exclude_session);
  }

  if (query.since_seconds) {
    conditions.push('created_at > unixepoch() - ?');
    params.push(query.since_seconds);
  }

  if (query.uncommitted_only) {
    conditions.push('committed = 0');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = query.limit ?? 100;

  const sql = `
    SELECT id, session_id, file_path, operation, branch, intent, committed, commit_hash, created_at
    FROM activity_log
    ${where}
    ORDER BY created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  return db.prepare(sql).all(...params) as ActivityRecord[];
}

/**
 * Get activity for a specific session.
 */
export function getSessionActivity(sessionId: string, uncommittedOnly = false): ActivityRecord[] {
  return queryActivity({
    session_id: sessionId,
    uncommitted_only: uncommittedOnly,
  });
}

/**
 * Get recent activity on a file from other sessions.
 */
export function getFileActivity(
  filePath: string,
  excludeSession: string,
  sinceSeconds = 300
): ActivityRecord[] {
  return queryActivity({
    file_path: filePath,
    exclude_session: excludeSession,
    since_seconds: sinceSeconds,
  });
}

/**
 * Mark activities as committed.
 */
export function markCommitted(sessionId: string, commitHash: string): number {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE activity_log
    SET committed = 1, commit_hash = ?
    WHERE session_id = ? AND committed = 0
  `);
  const result = stmt.run(commitHash, sessionId);
  return result.changes;
}

/**
 * Get uncommitted files for a session.
 */
export function getUncommittedFiles(sessionId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT DISTINCT file_path
    FROM activity_log
    WHERE session_id = ? AND committed = 0
    ORDER BY created_at DESC
  `
    )
    .all(sessionId) as { file_path: string }[];
  return rows.map((r) => r.file_path);
}

/**
 * Clean up old activity records (default: older than 24 hours).
 */
export function cleanupOldActivity(olderThanSeconds = 86400): number {
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM activity_log
    WHERE created_at < unixepoch() - ?
  `);
  const result = stmt.run(olderThanSeconds);
  return result.changes;
}

/**
 * Clean up orphaned activity records for inactive sessions.
 * Removes uncommitted activities for sessions that have been inactive for over 30 minutes.
 */
export function cleanupOrphanedActivity(): number {
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM activity_log
    WHERE committed = 0
    AND session_id IN (
      SELECT id FROM coordination_sessions
      WHERE status = 'inactive'
      AND deactivated_at < unixepoch() - 1800
    )
  `);
  const result = stmt.run();
  return result.changes;
}

/**
 * Run all cleanup tasks.
 * Call this periodically (e.g., on session start or via cron).
 */
export function runCleanup(): { oldRecords: number; orphanedRecords: number } {
  const oldRecords = cleanupOldActivity();
  const orphanedRecords = cleanupOrphanedActivity();
  return { oldRecords, orphanedRecords };
}
