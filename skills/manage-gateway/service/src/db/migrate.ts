import Database from 'better-sqlite3';
import * as path from 'path';
import {
  USAGE_LOGS_TABLE,
  KILL_SWITCH_TABLE,
  USAGE_LOGS_INDEX,
  USAGE_LOGS_TIME_INDEX,
  USAGE_LOGS_CLIENT_INDEX,
  RATE_LIMIT_BUCKETS_TABLE,
  RATE_LIMIT_CONCURRENCY_TABLE,
  RATE_LIMIT_CONCURRENCY_INDEX,
  COORDINATION_SESSIONS_TABLE,
  COORDINATION_SESSIONS_CLIENT_INDEX,
  COORDINATION_SESSIONS_ACTIVITY_INDEX,
  COORDINATION_SESSIONS_STATUS_INDEX,
  COORDINATION_LOCKS_TABLE,
  COORDINATION_LOCKS_TARGET_INDEX,
  COORDINATION_LOCKS_SESSION_INDEX,
  CLIENTS_TABLE,
  CLIENTS_TOKEN_INDEX,
  SESSION_HISTORY_TABLE,
  SESSION_HISTORY_SOURCE_INDEX,
  SESSION_HISTORY_PROJECT_INDEX,
  SESSION_HISTORY_START_TIME_INDEX,
  ACTIVITY_LOG_TABLE,
  ACTIVITY_LOG_FILE_INDEX,
  ACTIVITY_LOG_SESSION_INDEX,
  ACTIVITY_LOG_TIME_INDEX,
  ACTIVITY_LOG_UNCOMMITTED_INDEX,
} from './schema';

let db: Database.Database | null = null;

function getDbPath(): string {
  return path.join(__dirname, '..', '..', 'gateway.db');
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database): void {
  database.exec(USAGE_LOGS_TABLE);
  database.exec(KILL_SWITCH_TABLE);
  database.exec(USAGE_LOGS_INDEX);
  database.exec(USAGE_LOGS_TIME_INDEX);
  database.exec(RATE_LIMIT_BUCKETS_TABLE);
  database.exec(RATE_LIMIT_CONCURRENCY_TABLE);
  database.exec(RATE_LIMIT_CONCURRENCY_INDEX);

  // Migration: add client_id column if missing (existing tables)
  // Must run BEFORE creating client_id index
  const cols = database.prepare("PRAGMA table_info(usage_logs)").all() as { name: string }[];
  if (!cols.some((c) => c.name === 'client_id')) {
    database.exec('ALTER TABLE usage_logs ADD COLUMN client_id TEXT');
  }

  // Create client_id index after column exists
  database.exec(USAGE_LOGS_CLIENT_INDEX);

  // Coordination tables for multi-session lock management
  database.pragma('foreign_keys = ON');
  database.exec(COORDINATION_SESSIONS_TABLE);
  database.exec(COORDINATION_SESSIONS_CLIENT_INDEX);
  database.exec(COORDINATION_SESSIONS_ACTIVITY_INDEX);

  // Migration: add status and deactivated_at columns to coordination_sessions if missing
  // Must run BEFORE creating status index
  const sessionCols = database.prepare("PRAGMA table_info(coordination_sessions)").all() as { name: string }[];
  if (!sessionCols.some((c) => c.name === 'status')) {
    database.exec("ALTER TABLE coordination_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))");
  }
  if (!sessionCols.some((c) => c.name === 'deactivated_at')) {
    database.exec('ALTER TABLE coordination_sessions ADD COLUMN deactivated_at INTEGER');
  }

  // Create status index after column exists
  database.exec(COORDINATION_SESSIONS_STATUS_INDEX);

  database.exec(COORDINATION_LOCKS_TABLE);
  database.exec(COORDINATION_LOCKS_TARGET_INDEX);
  database.exec(COORDINATION_LOCKS_SESSION_INDEX);

  // Client registration table
  database.exec(CLIENTS_TABLE);
  database.exec(CLIENTS_TOKEN_INDEX);

  // Session history table for imported archived sessions
  database.exec(SESSION_HISTORY_TABLE);
  database.exec(SESSION_HISTORY_SOURCE_INDEX);
  database.exec(SESSION_HISTORY_PROJECT_INDEX);
  database.exec(SESSION_HISTORY_START_TIME_INDEX);

  // Activity log for orchestration
  database.exec(ACTIVITY_LOG_TABLE);
  database.exec(ACTIVITY_LOG_FILE_INDEX);
  database.exec(ACTIVITY_LOG_SESSION_INDEX);
  database.exec(ACTIVITY_LOG_TIME_INDEX);
  database.exec(ACTIVITY_LOG_UNCOMMITTED_INDEX);
}
