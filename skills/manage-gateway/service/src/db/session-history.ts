import { getDb } from './migrate';
import { homedir } from 'os';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

export interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch?: string;
  projectPath: string;
  isSidechain?: boolean;
}

export interface SessionIndex {
  version: number;
  entries: SessionIndexEntry[];
}

export interface SessionHistoryRow {
  id: number;
  source: string;
  session_id: string;
  project: string;
  summary: string | null;
  turn_count: number | null;
  start_time: number | null;
  end_time: number | null;
  imported_at: number;
}

export interface SessionListFilters {
  project?: string;
  source?: string;
  after?: string; // ISO date string
  search?: string;
  limit?: number;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  sources: Map<string, number>;
}

/**
 * Discover all sessions-index.json files from known locations
 */
export function discoverIndexFiles(): { path: string; source: string }[] {
  const home = homedir();
  const results: { path: string; source: string }[] = [];

  // CCS instances: ~/.ccs/instances/*/projects/*/sessions-index.json
  const ccsBase = join(home, '.ccs', 'instances');
  if (existsSync(ccsBase)) {
    try {
      const instances = readdirSync(ccsBase);
      for (const instance of instances) {
        const projectsDir = join(ccsBase, instance, 'projects');
        if (existsSync(projectsDir) && statSync(projectsDir).isDirectory()) {
          const projects = readdirSync(projectsDir);
          for (const project of projects) {
            const indexPath = join(projectsDir, project, 'sessions-index.json');
            if (existsSync(indexPath)) {
              results.push({ path: indexPath, source: `ccs/${instance}` });
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Legacy: ~/.claude/projects/*/sessions-index.json
  const legacyBase = join(home, '.claude', 'projects');
  if (existsSync(legacyBase)) {
    try {
      const projects = readdirSync(legacyBase);
      for (const project of projects) {
        const indexPath = join(legacyBase, project, 'sessions-index.json');
        if (existsSync(indexPath)) {
          results.push({ path: indexPath, source: 'legacy' });
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return results;
}

/**
 * Parse a sessions-index.json file
 */
export function parseIndexFile(filePath: string): SessionIndex | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as SessionIndex;
    if (!data.entries || !Array.isArray(data.entries)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Extract project name from path like "-Users-andyrong-dg-prototype"
 */
function extractProjectName(projectPath: string): string {
  // If it's a full path, get the last segment
  const name = basename(projectPath);
  // Remove leading dash and convert dashes to meaningful name
  // e.g., "-Users-andyrong-dg-prototype" -> "dg-prototype"
  const parts = name.split('-').filter(Boolean);
  // Return last 2-3 meaningful parts
  if (parts.length >= 2) {
    return parts.slice(-2).join('-');
  }
  return name;
}

/**
 * Import a single session entry
 * Returns true if imported, false if skipped (already exists)
 */
export function importSession(entry: SessionIndexEntry, source: string): boolean {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO session_history
    (source, session_id, project, summary, turn_count, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const project = extractProjectName(entry.projectPath);
  const startTime = entry.created ? Math.floor(new Date(entry.created).getTime() / 1000) : null;
  const endTime = entry.modified ? Math.floor(new Date(entry.modified).getTime() / 1000) : null;

  const result = stmt.run(
    source,
    entry.sessionId,
    project,
    entry.summary || null,
    entry.messageCount || null,
    startTime,
    endTime
  );

  return result.changes > 0;
}

/**
 * Import all sessions from all discovered index files
 */
export function importAllSessions(dryRun = false): ImportResult {
  const indexFiles = discoverIndexFiles();
  const result: ImportResult = {
    total: 0,
    imported: 0,
    skipped: 0,
    sources: new Map(),
  };

  for (const { path, source } of indexFiles) {
    const index = parseIndexFile(path);
    if (!index) continue;

    for (const entry of index.entries) {
      result.total++;

      if (dryRun) {
        result.imported++;
        result.sources.set(source, (result.sources.get(source) || 0) + 1);
      } else {
        const wasImported = importSession(entry, source);
        if (wasImported) {
          result.imported++;
          result.sources.set(source, (result.sources.get(source) || 0) + 1);
        } else {
          result.skipped++;
        }
      }
    }
  }

  return result;
}

/**
 * List sessions with optional filters
 */
export function listSessions(filters: SessionListFilters = {}): SessionHistoryRow[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.project) {
    conditions.push('project LIKE ?');
    params.push(`%${filters.project}%`);
  }

  if (filters.source) {
    conditions.push('source LIKE ?');
    params.push(`%${filters.source}%`);
  }

  if (filters.after) {
    const afterTime = Math.floor(new Date(filters.after).getTime() / 1000);
    conditions.push('start_time >= ?');
    params.push(afterTime);
  }

  if (filters.search) {
    conditions.push('summary LIKE ?');
    params.push(`%${filters.search}%`);
  }

  const limit = filters.limit || 50;
  params.push(limit);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT id, source, session_id, project, summary, turn_count, start_time, end_time, imported_at
    FROM session_history
    ${whereClause}
    ORDER BY start_time DESC
    LIMIT ?
  `;

  return db.prepare(sql).all(...params) as SessionHistoryRow[];
}

/**
 * Get session count by source
 */
export function getSessionStats(): { source: string; count: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT source, COUNT(*) as count
    FROM session_history
    GROUP BY source
    ORDER BY count DESC
  `).all() as { source: string; count: number }[];
}
