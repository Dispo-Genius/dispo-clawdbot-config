import { getDb } from '../db/migrate';

export interface Session {
  id: string;
  user: string;
  project: string;
  cwd: string;
  branch?: string;
  client_id: string;
  files_editing?: string[];
  current_operation?: string;
  operation_details?: string;
  last_activity_at: number;
  created_at: number;
}

interface SessionRow {
  id: string;
  user: string;
  project: string;
  cwd: string;
  branch: string | null;
  client_id: string;
  files_editing: string | null;
  current_operation: string | null;
  operation_details: string | null;
  last_activity_at: number;
  created_at: number;
}

export interface CreateSessionInput {
  id: string;
  user: string;
  project: string;
  cwd: string;
  branch?: string;
  client_id: string;
}

export interface UpdateSessionInput {
  last_activity_at?: number;
  files_editing?: string[];
  current_operation?: string;
  operation_details?: string;
}

function rowToSession(row: SessionRow): Session {
  return {
    ...row,
    branch: row.branch ?? undefined,
    files_editing: row.files_editing ? JSON.parse(row.files_editing) : undefined,
    current_operation: row.current_operation ?? undefined,
    operation_details: row.operation_details ?? undefined,
  };
}

export function createSession(input: CreateSessionInput): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO coordination_sessions (id, user, project, cwd, branch, client_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.id, input.user, input.project, input.cwd, input.branch ?? null, input.client_id);
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM coordination_sessions WHERE id = ?
  `).get(id) as SessionRow | undefined;
  return row ? rowToSession(row) : null;
}

export function listSessions(filters?: { client_id?: string; project?: string }): Session[] {
  const db = getDb();
  let sql = 'SELECT * FROM coordination_sessions WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.client_id) {
    sql += ' AND client_id = ?';
    params.push(filters.client_id);
  }
  if (filters?.project) {
    sql += ' AND project = ?';
    params.push(filters.project);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as SessionRow[];
  return rows.map(rowToSession);
}

export function updateSession(id: string, input: UpdateSessionInput): boolean {
  const db = getDb();
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.last_activity_at !== undefined) {
    updates.push('last_activity_at = ?');
    params.push(input.last_activity_at);
  }
  if (input.files_editing !== undefined) {
    updates.push('files_editing = ?');
    params.push(JSON.stringify(input.files_editing));
  }
  if (input.current_operation !== undefined) {
    updates.push('current_operation = ?');
    params.push(input.current_operation);
  }
  if (input.operation_details !== undefined) {
    updates.push('operation_details = ?');
    params.push(input.operation_details);
  }

  if (updates.length === 0) {
    return false;
  }

  params.push(id);
  const result = db.prepare(`
    UPDATE coordination_sessions SET ${updates.join(', ')} WHERE id = ?
  `).run(...params);

  return result.changes > 0;
}

export function deleteSession(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM coordination_sessions WHERE id = ?
  `).run(id);
  return result.changes > 0;
}

export function cleanupStaleSessions(maxAgeSeconds: number = 300): number {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  const result = db.prepare(`
    DELETE FROM coordination_sessions WHERE last_activity_at < ?
  `).run(cutoff);
  return result.changes;
}

export function touchSession(id: string): boolean {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(`
    UPDATE coordination_sessions SET last_activity_at = ? WHERE id = ?
  `).run(now, id);
  return result.changes > 0;
}
