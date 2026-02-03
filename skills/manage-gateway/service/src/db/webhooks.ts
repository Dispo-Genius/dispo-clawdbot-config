import { getDb } from './migrate';

// Schema
export const WEBHOOK_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  mailbox_id TEXT,
  thread_id TEXT,
  message_id TEXT,
  payload TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const WEBHOOK_EVENTS_MAILBOX_INDEX = `
CREATE INDEX IF NOT EXISTS idx_webhook_events_mailbox ON webhook_events(mailbox_id)`;

export const WEBHOOK_EVENTS_TIME_INDEX = `
CREATE INDEX IF NOT EXISTS idx_webhook_events_time ON webhook_events(received_at)`;

export interface WebhookEvent {
  id: number;
  event_type: string;
  mailbox_id: string | null;
  thread_id: string | null;
  message_id: string | null;
  payload: string;
  received_at: string;
}

export interface WebhookEventInput {
  event_type: string;
  mailbox_id?: string;
  thread_id?: string;
  message_id?: string;
  timestamp?: string;
  data?: unknown;
  // AgentMail webhook structure
  message?: {
    message_id?: string;
    inbox_id?: string;
    thread_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    text?: string;
    html?: string;
    extracted_text?: string;
  };
  thread?: {
    thread_id?: string;
  };
}

let initialized = false;

export function initWebhooksDb(): void {
  if (initialized) return;

  const db = getDb();
  db.exec(WEBHOOK_EVENTS_TABLE);
  db.exec(WEBHOOK_EVENTS_MAILBOX_INDEX);
  db.exec(WEBHOOK_EVENTS_TIME_INDEX);
  initialized = true;
}

export function storeEvent(event: WebhookEventInput): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO webhook_events (event_type, mailbox_id, thread_id, message_id, payload)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    event.event_type,
    event.mailbox_id ?? null,
    event.thread_id ?? null,
    event.message_id ?? null,
    JSON.stringify(event)
  );

  return result.lastInsertRowid as number;
}

export interface GetEventsOptions {
  since?: string;
  mailbox_id?: string;
  limit?: number;
}

export function getEvents(options: GetEventsOptions = {}): WebhookEvent[] {
  const db = getDb();
  const { since, mailbox_id, limit = 100 } = options;

  let sql = 'SELECT * FROM webhook_events WHERE 1=1';
  const params: unknown[] = [];

  if (since) {
    sql += ' AND received_at > ?';
    params.push(since);
  }

  if (mailbox_id) {
    sql += ' AND mailbox_id = ?';
    params.push(mailbox_id);
  }

  sql += ' ORDER BY received_at DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params) as WebhookEvent[];
}

export function getEventsSince(timestamp: string): WebhookEvent[] {
  return getEvents({ since: timestamp });
}

export function pruneOldEvents(daysOld: number = 7): number {
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM webhook_events
    WHERE received_at < datetime('now', '-' || ? || ' days')
  `);
  const result = stmt.run(daysOld);
  return result.changes;
}
