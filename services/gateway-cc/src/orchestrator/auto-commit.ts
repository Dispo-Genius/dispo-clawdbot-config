import { getDb } from '../db/migrate';
import { getUncommittedFiles, queryActivity, markCommitted } from './activity';
import { getSession } from '../coordination/session-registry';
import { spawn } from 'child_process';

/**
 * Auto-commit configuration for a session.
 */
export interface AutoCommitConfig {
  session_id: string;
  enabled: boolean;
  debounce_ms: number;
  last_commit_hash: string | null;
  last_commit_at: number | null;
  pending_since: number | null;
}

/**
 * Queued auto-commit job.
 */
export interface AutoCommitJob {
  id: number;
  session_id: string;
  task_id: string | null;
  triggered_at: number;
  execute_at: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result: string | null;
  completed_at: number | null;
}

/**
 * Result of an auto-commit execution.
 */
export interface AutoCommitResult {
  success: boolean;
  commit_hash?: string;
  message?: string;
  error?: string;
  files_committed?: string[];
}

// Rate limiting: min 2 minutes between commits per session
const MIN_COMMIT_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Get or create auto-commit config for a session.
 */
export function getConfig(sessionId: string): AutoCommitConfig | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT session_id, enabled, debounce_ms, last_commit_hash, last_commit_at, pending_since
    FROM auto_commit_config
    WHERE session_id = ?
  `).get(sessionId) as AutoCommitConfig | undefined;

  return row ?? null;
}

/**
 * Update auto-commit config for a session.
 */
export function updateConfig(
  sessionId: string,
  updates: Partial<Pick<AutoCommitConfig, 'enabled' | 'debounce_ms'>>
): AutoCommitConfig {
  const db = getDb();

  // Upsert config
  db.prepare(`
    INSERT INTO auto_commit_config (session_id, enabled, debounce_ms, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(session_id) DO UPDATE SET
      enabled = COALESCE(excluded.enabled, enabled),
      debounce_ms = COALESCE(excluded.debounce_ms, debounce_ms),
      updated_at = unixepoch()
  `).run(
    sessionId,
    updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : 1,
    updates.debounce_ms ?? 30000
  );

  return getConfig(sessionId)!;
}

/**
 * Queue an auto-commit for a session with debounce.
 * Cancels any existing pending jobs for this session.
 */
export function queueAutoCommit(
  sessionId: string,
  taskId?: string,
  debounceMs?: number
): AutoCommitJob {
  const db = getDb();
  const config = getConfig(sessionId) ?? updateConfig(sessionId, {});
  const debounce = debounceMs ?? config.debounce_ms;
  const now = Math.floor(Date.now() / 1000);
  const executeAt = now + Math.floor(debounce / 1000);

  return db.transaction(() => {
    // Cancel any pending jobs for this session
    db.prepare(`
      UPDATE auto_commit_queue
      SET status = 'cancelled', completed_at = unixepoch()
      WHERE session_id = ? AND status = 'pending'
    `).run(sessionId);

    // Insert new job
    const result = db.prepare(`
      INSERT INTO auto_commit_queue (session_id, task_id, triggered_at, execute_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, taskId ?? null, now, executeAt);

    // Update config pending_since
    db.prepare(`
      UPDATE auto_commit_config
      SET pending_since = ?
      WHERE session_id = ?
    `).run(now, sessionId);

    return db.prepare(`
      SELECT * FROM auto_commit_queue WHERE id = ?
    `).get(result.lastInsertRowid) as AutoCommitJob;
  })();
}

/**
 * Get the next pending job that's ready to execute.
 */
export function getNextPendingJob(): AutoCommitJob | null {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  return db.prepare(`
    SELECT * FROM auto_commit_queue
    WHERE status = 'pending' AND execute_at <= ?
    ORDER BY execute_at ASC
    LIMIT 1
  `).get(now) as AutoCommitJob | undefined ?? null;
}

/**
 * Update job status.
 */
export function updateJobStatus(
  jobId: number,
  status: AutoCommitJob['status'],
  result?: string
): void {
  const db = getDb();
  db.prepare(`
    UPDATE auto_commit_queue
    SET status = ?, result = ?, completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN unixepoch() ELSE NULL END
    WHERE id = ?
  `).run(status, result ?? null, status, jobId);
}

/**
 * Check if a session can auto-commit (respects rate limit).
 */
export function canAutoCommit(sessionId: string): { allowed: boolean; reason?: string } {
  const config = getConfig(sessionId);

  if (!config) {
    return { allowed: true };
  }

  if (!config.enabled) {
    return { allowed: false, reason: 'Auto-commit disabled for session' };
  }

  if (config.last_commit_at) {
    const elapsed = Date.now() - config.last_commit_at * 1000;
    if (elapsed < MIN_COMMIT_INTERVAL_MS) {
      const remaining = Math.ceil((MIN_COMMIT_INTERVAL_MS - elapsed) / 1000);
      return { allowed: false, reason: `Rate limited: ${remaining}s until next commit allowed` };
    }
  }

  return { allowed: true };
}

/**
 * Generate commit message from activity intents using Haiku.
 */
async function generateCommitMessage(
  sessionId: string,
  files: string[],
  branch: string | null
): Promise<string> {
  // Get recent intents from activity log
  const activities = queryActivity({
    session_id: sessionId,
    uncommitted_only: true,
    limit: 20,
  });

  const intents = activities
    .filter((a) => a.intent)
    .map((a) => a.intent)
    .filter((v, i, a) => a.indexOf(v) === i); // unique

  // Build file summary
  const filesByExt = new Map<string, number>();
  for (const f of files) {
    const ext = f.split('.').pop() || 'other';
    filesByExt.set(ext, (filesByExt.get(ext) || 0) + 1);
  }
  const fileSummary = Array.from(filesByExt.entries())
    .map(([ext, count]) => `${count} ${ext}`)
    .join(', ');

  // For now, generate a simple message without calling Haiku
  // TODO: Add Haiku call for smarter messages
  if (intents.length > 0 && intents[0]) {
    // Use the most recent intent as the main message
    const mainIntent = intents[0];
    const type = mainIntent.includes('fix') ? 'fix' : mainIntent.includes('add') ? 'feat' : 'refactor';
    return `${type}: ${mainIntent}`;
  }

  // Fallback to file-based message
  return `chore: update ${fileSummary}`;
}

/**
 * Execute an auto-commit for a session.
 * This runs the simplified commit pipeline.
 */
export async function executeAutoCommit(sessionId: string): Promise<AutoCommitResult> {
  const session = getSession(sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  // Check rate limit
  const canCommitResult = canAutoCommit(sessionId);
  if (!canCommitResult.allowed) {
    return { success: false, error: canCommitResult.reason };
  }

  // Get uncommitted files
  const files = getUncommittedFiles(sessionId);
  if (files.length === 0) {
    return { success: false, error: 'No uncommitted files' };
  }

  // Safety: Check if on main branch
  const cwd = session.cwd;
  const branch = await runGitCommand(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch.trim() === 'main' || branch.trim() === 'master') {
    return { success: false, error: 'Cannot auto-commit on main/master branch' };
  }

  // Check for uncommitted changes in git
  const status = await runGitCommand(cwd, ['status', '--porcelain']);
  if (!status.trim()) {
    // No actual changes - mark activities as committed without creating a commit
    return { success: false, error: 'No uncommitted git changes' };
  }

  // Safety: Run typecheck (if package.json exists with typecheck script)
  const hasTypecheck = await checkScript(cwd, 'typecheck');
  if (hasTypecheck) {
    try {
      await runNpmScript(cwd, 'typecheck');
    } catch (err) {
      return { success: false, error: `Typecheck failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // Safety: Run build (if package.json exists with build script)
  const hasBuild = await checkScript(cwd, 'build');
  if (hasBuild) {
    try {
      await runNpmScript(cwd, 'build');
    } catch (err) {
      return { success: false, error: `Build failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // Generate commit message
  const message = await generateCommitMessage(sessionId, files, branch.trim());

  // Stage all changes
  await runGitCommand(cwd, ['add', '-A']);

  // Commit
  const commitMessage = `${message}\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;
  await runGitCommand(cwd, ['commit', '-m', commitMessage]);

  // Get commit hash
  const commitHash = (await runGitCommand(cwd, ['rev-parse', 'HEAD'])).trim();

  // Push
  try {
    await runGitCommand(cwd, ['push']);
  } catch (err) {
    // Push failed - still mark as committed since local commit succeeded
    console.warn(`[auto-commit] Push failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Mark activities as committed
  markCommitted(sessionId, commitHash);

  // Update config
  const db = getDb();
  db.prepare(`
    UPDATE auto_commit_config
    SET last_commit_hash = ?, last_commit_at = unixepoch(), pending_since = NULL
    WHERE session_id = ?
  `).run(commitHash, sessionId);

  return {
    success: true,
    commit_hash: commitHash,
    message,
    files_committed: files,
  };
}

/**
 * Run a git command and return stdout.
 */
async function runGitCommand(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data;
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `git ${args[0]} failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Check if a script exists in package.json.
 */
async function checkScript(cwd: string, scriptName: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const pkgPath = `${cwd}/package.json`;
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
    return !!(pkg.scripts && pkg.scripts[scriptName]);
  } catch {
    return false;
  }
}

/**
 * Run an npm script.
 */
async function runNpmScript(cwd: string, scriptName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', scriptName], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `npm run ${scriptName} failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Process pending auto-commit jobs.
 * Should be called periodically (e.g., every 10 seconds).
 */
export async function processPendingJobs(): Promise<void> {
  const job = getNextPendingJob();
  if (!job) return;

  console.log(`[auto-commit] Processing job ${job.id} for session ${job.session_id}`);
  updateJobStatus(job.id, 'running');

  try {
    const result = await executeAutoCommit(job.session_id);

    if (result.success) {
      updateJobStatus(job.id, 'completed', JSON.stringify(result));
      console.log(`[auto-commit] Job ${job.id} completed: ${result.commit_hash}`);
    } else {
      updateJobStatus(job.id, 'failed', result.error);
      console.log(`[auto-commit] Job ${job.id} failed: ${result.error}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    updateJobStatus(job.id, 'failed', errorMsg);
    console.error(`[auto-commit] Job ${job.id} error: ${errorMsg}`);
  }
}

/**
 * Get auto-commit status for a session.
 */
export function getAutoCommitStatus(sessionId: string): {
  config: AutoCommitConfig | null;
  pending_job: AutoCommitJob | null;
  recent_commits: { hash: string; at: number }[];
} {
  const db = getDb();
  const config = getConfig(sessionId);

  const pendingJob = db.prepare(`
    SELECT * FROM auto_commit_queue
    WHERE session_id = ? AND status = 'pending'
    ORDER BY execute_at ASC
    LIMIT 1
  `).get(sessionId) as AutoCommitJob | undefined;

  const recentJobs = db.prepare(`
    SELECT result FROM auto_commit_queue
    WHERE session_id = ? AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 5
  `).all(sessionId) as { result: string }[];

  const recentCommits = recentJobs
    .map((j) => {
      try {
        const r = JSON.parse(j.result);
        return r.commit_hash ? { hash: r.commit_hash, at: 0 } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { hash: string; at: number }[];

  return {
    config,
    pending_job: pendingJob ?? null,
    recent_commits: recentCommits,
  };
}
