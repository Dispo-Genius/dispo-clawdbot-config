import type { IncomingMessage, ServerResponse } from 'http';
import { listSessions } from '../coordination/session-registry';
import {
  logActivity,
  queryActivity,
  getFileActivity,
  getSessionActivity,
  getUncommittedFiles,
  markCommitted,
  runCleanup,
  type ActivityInput,
  type Operation,
} from './activity';
import {
  queueAutoCommit,
  updateConfig,
  getAutoCommitStatus,
  executeAutoCommit,
} from './auto-commit';
import {
  getPRWatchStatus,
  fetchOpenPRs,
  clearPRCache,
  getOverlappingPRs,
} from './pr-watch';
import { getSession } from '../coordination/session-registry';

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// POST /orchestrator/activity/log
async function handleLogActivity(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: ActivityInput;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id, file_path, operation, branch, intent } = body;
  if (!session_id || !file_path || !operation) {
    sendJson(res, 400, { error: 'Missing required fields: session_id, file_path, operation' });
    return;
  }

  const validOps: Operation[] = ['read', 'edit', 'write', 'delete'];
  if (!validOps.includes(operation)) {
    sendJson(res, 400, { error: `Invalid operation. Must be one of: ${validOps.join(', ')}` });
    return;
  }

  try {
    const id = logActivity({ session_id, file_path, operation, branch, intent });
    console.log(`[orchestrator] Activity logged: ${session_id} ${operation} ${file_path}`);
    sendJson(res, 200, { success: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Log activity error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to log activity' });
  }
}

// GET /orchestrator/activity/query
async function handleQueryActivity(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const file_path = url.searchParams.get('file') ?? undefined;
  const session_id = url.searchParams.get('session') ?? undefined;
  const exclude_session = url.searchParams.get('exclude_session') ?? undefined;
  const since = url.searchParams.get('since');
  const uncommittedStr = url.searchParams.get('uncommitted');
  const limitStr = url.searchParams.get('limit');

  try {
    const activity = queryActivity({
      file_path,
      session_id,
      exclude_session,
      since_seconds: since ? parseInt(since, 10) : undefined,
      uncommitted_only: uncommittedStr === 'true',
      limit: limitStr ? parseInt(limitStr, 10) : 100,
    });
    sendJson(res, 200, { activity, count: activity.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Query activity error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to query activity' });
  }
}

// GET /orchestrator/status
// Returns status for status line display
async function handleStatus(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const session_id = url.searchParams.get('session_id');

  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required query param: session_id' });
    return;
  }

  try {
    // Get all active sessions
    const allSessions = listSessions({ status: 'active' });
    const otherSessions = allSessions.filter((s) => s.id !== session_id);

    // Get recent activity from other sessions (last 5 minutes)
    const recentActivity: { display_name: string; file_path: string; operation: string }[] = [];
    for (const session of otherSessions) {
      const activity = getSessionActivity(session.id, false);
      const recent = activity.filter((a) => a.created_at > Date.now() / 1000 - 300);
      // Use user name for display (e.g., "andy" instead of "Andys-MacBook-Pro:account1")
      const displayName = session.user || session.client_id.split(':')[0];
      for (const a of recent.slice(0, 5)) {
        recentActivity.push({
          display_name: displayName,
          file_path: a.file_path,
          operation: a.operation,
        });
      }
    }

    // Get uncommitted files for this session
    const uncommittedFiles = getUncommittedFiles(session_id);

    // Build warnings
    const warnings: string[] = [];
    const seenFiles = new Set<string>();
    const verbMap: Record<string, string> = {
      edit: 'editing',
      write: 'writing',
      read: 'reading',
      delete: 'deleting',
    };
    for (const a of recentActivity) {
      const shortPath = a.file_path.split('/').slice(-2).join('/');
      const key = `${a.display_name}:${shortPath}`;
      if (!seenFiles.has(key)) {
        seenFiles.add(key);
        const verb = verbMap[a.operation] || `${a.operation}ing`;
        warnings.push(`${a.display_name} ${verb} ${shortPath}`);
      }
    }

    // Build nudges
    const nudges: string[] = [];
    if (uncommittedFiles.length > 0) {
      nudges.push(`${uncommittedFiles.length} uncommitted file${uncommittedFiles.length > 1 ? 's' : ''}`);
    }

    // Check for PR overlaps (non-blocking, best effort)
    let prOverlaps: { number: number; title: string; files: string[] }[] = [];
    try {
      const session = getSession(session_id);
      if (session) {
        const overlaps = await getOverlappingPRs(session_id, session.cwd);
        prOverlaps = overlaps.map((o) => ({
          number: o.pr.number,
          title: o.pr.title,
          files: o.overlapping_files,
        }));

        // Add PR warnings
        for (const overlap of overlaps.slice(0, 2)) {
          warnings.push(`PR #${overlap.pr.number} touches ${overlap.overlap_count} file(s) you're editing`);
        }
      }
    } catch {
      // Ignore PR check failures - don't block status response
    }

    sendJson(res, 200, {
      other_sessions: otherSessions.map((s) => ({
        id: s.id,
        client_id: s.client_id,
        project: s.project,
        branch: s.branch,
      })),
      warnings,
      nudges,
      uncommitted_files: uncommittedFiles,
      pr_overlaps: prOverlaps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Status error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to get status' });
  }
}

// POST /orchestrator/activity/commit
async function handleMarkCommitted(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { session_id: string; commit_hash: string };
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id, commit_hash } = body;
  if (!session_id || !commit_hash) {
    sendJson(res, 400, { error: 'Missing required fields: session_id, commit_hash' });
    return;
  }

  try {
    const count = markCommitted(session_id, commit_hash);
    console.log(`[orchestrator] Marked ${count} activities as committed for ${session_id}`);
    sendJson(res, 200, { success: true, count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Mark committed error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to mark committed' });
  }
}

// GET /orchestrator/activity/file
// Check if file has recent activity from other sessions
async function handleFileActivity(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const file_path = url.searchParams.get('file');
  const exclude_session = url.searchParams.get('exclude_session');
  const sinceStr = url.searchParams.get('since');

  if (!file_path) {
    sendJson(res, 400, { error: 'Missing required query param: file' });
    return;
  }

  try {
    const since = sinceStr ? parseInt(sinceStr, 10) : 300;
    const activity = getFileActivity(file_path, exclude_session ?? '', since);
    sendJson(res, 200, {
      has_activity: activity.length > 0,
      activity,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] File activity error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to get file activity' });
  }
}

// POST /orchestrator/cleanup
// Manually trigger cleanup of old and orphaned activity records
async function handleCleanup(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const result = runCleanup();
    console.log(`[orchestrator] Cleanup: ${result.oldRecords} old, ${result.orphanedRecords} orphaned`);
    sendJson(res, 200, { success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Cleanup error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to run cleanup' });
  }
}

// POST /orchestrator/auto-commit/trigger
// Trigger an auto-commit for a session (with debounce)
async function handleAutoCommitTrigger(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { session_id: string; task_id?: string; debounce_ms?: number };
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id, task_id, debounce_ms } = body;
  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required field: session_id' });
    return;
  }

  try {
    const job = queueAutoCommit(session_id, task_id, debounce_ms);
    console.log(`[orchestrator] Auto-commit queued: job ${job.id} for session ${session_id}`);
    sendJson(res, 200, {
      success: true,
      job_id: job.id,
      execute_at: job.execute_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Auto-commit trigger error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to queue auto-commit' });
  }
}

// GET /orchestrator/auto-commit/status
// Get auto-commit status for a session
async function handleAutoCommitStatus(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const session_id = url.searchParams.get('session_id');

  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required query param: session_id' });
    return;
  }

  try {
    const status = getAutoCommitStatus(session_id);
    sendJson(res, 200, status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Auto-commit status error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to get auto-commit status' });
  }
}

// POST /orchestrator/auto-commit/configure
// Configure auto-commit settings for a session
async function handleAutoCommitConfigure(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { session_id: string; enabled?: boolean; debounce_ms?: number };
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id, enabled, debounce_ms } = body;
  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required field: session_id' });
    return;
  }

  try {
    const config = updateConfig(session_id, { enabled, debounce_ms });
    console.log(`[orchestrator] Auto-commit config updated for ${session_id}: enabled=${config.enabled}`);
    sendJson(res, 200, { success: true, config });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Auto-commit configure error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to configure auto-commit' });
  }
}

// POST /orchestrator/auto-commit/execute
// Immediately execute an auto-commit (skip queue)
async function handleAutoCommitExecute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { session_id: string };
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id } = body;
  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required field: session_id' });
    return;
  }

  try {
    console.log(`[orchestrator] Executing immediate auto-commit for ${session_id}`);
    const result = await executeAutoCommit(session_id);

    if (result.success) {
      console.log(`[orchestrator] Auto-commit success: ${result.commit_hash}`);
      sendJson(res, 200, result);
    } else {
      console.log(`[orchestrator] Auto-commit failed: ${result.error}`);
      sendJson(res, 200, result);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] Auto-commit execute error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to execute auto-commit' });
  }
}

// GET /orchestrator/pr-watch/status
// Get PR watch status for a session
async function handlePRWatchStatus(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const session_id = url.searchParams.get('session_id');
  const cwd = url.searchParams.get('cwd') ?? undefined;

  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required query param: session_id' });
    return;
  }

  try {
    const status = await getPRWatchStatus(session_id, cwd);
    sendJson(res, 200, status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] PR watch status error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to get PR watch status' });
  }
}

// GET /orchestrator/pr-watch/prs
// Get all open PRs (cached)
async function handlePRWatchList(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const cwd = url.searchParams.get('cwd') ?? undefined;

  try {
    const prs = await fetchOpenPRs(cwd);
    sendJson(res, 200, { prs, count: prs.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] PR list error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to fetch PRs' });
  }
}

// POST /orchestrator/pr-watch/refresh
// Force refresh PR cache
async function handlePRWatchRefresh(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const cwd = url.searchParams.get('cwd') ?? undefined;

  try {
    clearPRCache();
    const prs = await fetchOpenPRs(cwd);
    console.log(`[orchestrator] PR cache refreshed: ${prs.length} PRs`);
    sendJson(res, 200, { success: true, prs_count: prs.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[orchestrator] PR refresh error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to refresh PRs' });
  }
}

// Main router for /orchestrator/* paths
export async function handleOrchestratorRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  method: string
): Promise<boolean> {
  // Activity log endpoint
  if (path === '/orchestrator/activity/log' && method === 'POST') {
    await handleLogActivity(req, res);
    return true;
  }

  // Activity query endpoint
  if (path === '/orchestrator/activity/query' && method === 'GET') {
    await handleQueryActivity(req, res);
    return true;
  }

  // File activity check
  if (path === '/orchestrator/activity/file' && method === 'GET') {
    await handleFileActivity(req, res);
    return true;
  }

  // Mark committed endpoint
  if (path === '/orchestrator/activity/commit' && method === 'POST') {
    await handleMarkCommitted(req, res);
    return true;
  }

  // Status endpoint (for status line)
  if (path === '/orchestrator/status' && method === 'GET') {
    await handleStatus(req, res);
    return true;
  }

  // Cleanup endpoint
  if (path === '/orchestrator/cleanup' && method === 'POST') {
    await handleCleanup(req, res);
    return true;
  }

  // Auto-commit endpoints
  if (path === '/orchestrator/auto-commit/trigger' && method === 'POST') {
    await handleAutoCommitTrigger(req, res);
    return true;
  }

  if (path === '/orchestrator/auto-commit/status' && method === 'GET') {
    await handleAutoCommitStatus(req, res);
    return true;
  }

  if (path === '/orchestrator/auto-commit/configure' && method === 'POST') {
    await handleAutoCommitConfigure(req, res);
    return true;
  }

  if (path === '/orchestrator/auto-commit/execute' && method === 'POST') {
    await handleAutoCommitExecute(req, res);
    return true;
  }

  // PR watch endpoints
  if (path === '/orchestrator/pr-watch/status' && method === 'GET') {
    await handlePRWatchStatus(req, res);
    return true;
  }

  if (path === '/orchestrator/pr-watch/prs' && method === 'GET') {
    await handlePRWatchList(req, res);
    return true;
  }

  if (path === '/orchestrator/pr-watch/refresh' && method === 'POST') {
    await handlePRWatchRefresh(req, res);
    return true;
  }

  return false;
}
