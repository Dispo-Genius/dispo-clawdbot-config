export const USAGE_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  command TEXT NOT NULL,
  exit_code INTEGER,
  duration_ms INTEGER,
  client_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const USAGE_LOGS_CLIENT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_usage_logs_client ON usage_logs(client_id)`;

export const KILL_SWITCH_TABLE = `
CREATE TABLE IF NOT EXISTS kill_switch (
  service TEXT PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const USAGE_LOGS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_usage_logs_service ON usage_logs(service)`;

export const USAGE_LOGS_TIME_INDEX = `
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at)`;

export const RATE_LIMIT_BUCKETS_TABLE = `
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  service TEXT PRIMARY KEY,
  tokens REAL NOT NULL,
  last_refill_at INTEGER NOT NULL,
  rate_per_minute INTEGER NOT NULL
)`;

export const RATE_LIMIT_CONCURRENCY_TABLE = `
CREATE TABLE IF NOT EXISTS rate_limit_concurrency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  pid INTEGER NOT NULL,
  started_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
)`;

export const RATE_LIMIT_CONCURRENCY_INDEX = `
CREATE INDEX IF NOT EXISTS idx_rlc_service ON rate_limit_concurrency(service)`;

// Multi-session coordination tables
export const COORDINATION_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS coordination_sessions (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL,
  project TEXT NOT NULL,
  cwd TEXT NOT NULL,
  branch TEXT,
  client_id TEXT NOT NULL,
  files_editing TEXT,
  current_operation TEXT,
  operation_details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  deactivated_at INTEGER,
  last_activity_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`;

export const COORDINATION_SESSIONS_CLIENT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_sessions_client ON coordination_sessions(client_id)`;

export const COORDINATION_SESSIONS_ACTIVITY_INDEX = `
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON coordination_sessions(last_activity_at)`;

export const COORDINATION_SESSIONS_STATUS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_sessions_status ON coordination_sessions(status)`;

export const COORDINATION_LOCKS_TABLE = `
CREATE TABLE IF NOT EXISTS coordination_locks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES coordination_sessions(id) ON DELETE CASCADE,
  lock_type TEXT NOT NULL,
  target TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('exclusive', 'shared')),
  acquired_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(session_id, lock_type, target)
)`;

export const COORDINATION_LOCKS_TARGET_INDEX = `
CREATE INDEX IF NOT EXISTS idx_locks_target ON coordination_locks(lock_type, target)`;

export const COORDINATION_LOCKS_SESSION_INDEX = `
CREATE INDEX IF NOT EXISTS idx_locks_session ON coordination_locks(session_id)`;

// Client registration table for team members
export const CLIENTS_TABLE = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  machine TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CLIENTS_TOKEN_INDEX = `
CREATE INDEX IF NOT EXISTS idx_clients_token ON clients(token)`;

// Session history table for imported archived sessions
export const SESSION_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS session_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  project TEXT NOT NULL,
  summary TEXT,
  turn_count INTEGER,
  start_time INTEGER,
  end_time INTEGER,
  imported_at INTEGER NOT NULL DEFAULT (unixepoch())
)`;

export const SESSION_HISTORY_SOURCE_INDEX = `
CREATE INDEX IF NOT EXISTS idx_session_history_source ON session_history(source)`;

export const SESSION_HISTORY_PROJECT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_session_history_project ON session_history(project)`;

export const SESSION_HISTORY_START_TIME_INDEX = `
CREATE INDEX IF NOT EXISTS idx_session_history_start_time ON session_history(start_time)`;

// Activity log for orchestration - tracks file operations across sessions
export const ACTIVITY_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('read', 'edit', 'write', 'delete')),
  branch TEXT,
  intent TEXT,
  committed INTEGER NOT NULL DEFAULT 0,
  commit_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`;

export const ACTIVITY_LOG_FILE_INDEX = `
CREATE INDEX IF NOT EXISTS idx_activity_file ON activity_log(file_path)`;

export const ACTIVITY_LOG_SESSION_INDEX = `
CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_log(session_id)`;

export const ACTIVITY_LOG_TIME_INDEX = `
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_log(created_at)`;

export const ACTIVITY_LOG_UNCOMMITTED_INDEX = `
CREATE INDEX IF NOT EXISTS idx_activity_uncommitted ON activity_log(committed) WHERE committed = 0`;
