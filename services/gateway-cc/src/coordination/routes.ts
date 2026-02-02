import type { IncomingMessage, ServerResponse } from 'http';
import {
  createSession,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
  cleanupStaleSessions,
  type CreateSessionInput,
  type UpdateSessionInput,
} from './session-registry';
import { acquireLock, releaseLock, releaseAllLocks, getSessionLocks } from './lock-manager';
import { checkOperation, type CheckRequest } from './rules';

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

// POST /coordination/sessions
async function handleCreateSession(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: CreateSessionInput;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { id, user, project, cwd, branch, client_id } = body;
  if (!id || !user || !project || !cwd || !client_id) {
    sendJson(res, 400, { error: 'Missing required fields: id, user, project, cwd, client_id' });
    return;
  }

  try {
    // Clean up stale sessions before creating new one
    const cleaned = cleanupStaleSessions(300);
    if (cleaned > 0) {
      console.log(`[coordination] Cleaned ${cleaned} stale sessions`);
    }

    createSession({ id, user, project, cwd, branch, client_id });
    console.log(`[coordination] Session created: ${id} (${client_id}/${user})`);
    sendJson(res, 200, { success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Handle duplicate session ID
    if (msg.includes('UNIQUE constraint failed')) {
      sendJson(res, 409, { error: 'Session already exists' });
      return;
    }
    console.error(`[coordination] Create session error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to create session' });
  }
}

// GET /coordination/sessions
async function handleListSessions(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const client_id = url.searchParams.get('client_id') ?? undefined;
  const project = url.searchParams.get('project') ?? undefined;

  try {
    const sessions = listSessions({ client_id, project });
    sendJson(res, 200, { sessions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] List sessions error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to list sessions' });
  }
}

// GET /coordination/sessions/:id
async function handleGetSession(id: string, res: ServerResponse): Promise<void> {
  try {
    const session = getSession(id);
    if (!session) {
      sendJson(res, 404, { error: 'Session not found' });
      return;
    }
    sendJson(res, 200, { session });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] Get session error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to get session' });
  }
}

// PATCH /coordination/sessions/:id
async function handleUpdateSession(
  id: string,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let body: UpdateSessionInput;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  try {
    const updated = updateSession(id, body);
    if (!updated) {
      sendJson(res, 404, { error: 'Session not found or no changes' });
      return;
    }
    sendJson(res, 200, { success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] Update session error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to update session' });
  }
}

// DELETE /coordination/sessions/:id
async function handleDeleteSession(id: string, res: ServerResponse): Promise<void> {
  try {
    // Locks are deleted via CASCADE when session is deleted
    const deleted = deleteSession(id);
    if (!deleted) {
      sendJson(res, 404, { error: 'Session not found' });
      return;
    }
    console.log(`[coordination] Session deleted: ${id}`);
    sendJson(res, 200, { success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] Delete session error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to delete session' });
  }
}

// POST /coordination/check
async function handleCheck(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: CheckRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id, operation, target } = body;
  if (!session_id || !operation || !target) {
    sendJson(res, 400, { error: 'Missing required fields: session_id, operation, target' });
    return;
  }

  try {
    const result = checkOperation({ session_id, operation, target });
    sendJson(res, 200, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] Check operation error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to check operation' });
  }
}

// POST /coordination/locks
async function handleAcquireLock(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: { session_id: string; lock_type: string; target: string; mode?: string };
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { session_id, lock_type, target, mode = 'exclusive' } = body;
  if (!session_id || !lock_type || !target) {
    sendJson(res, 400, { error: 'Missing required fields: session_id, lock_type, target' });
    return;
  }

  if (!['file', 'branch', 'resource'].includes(lock_type)) {
    sendJson(res, 400, { error: 'Invalid lock_type. Must be: file, branch, resource' });
    return;
  }

  if (!['exclusive', 'shared'].includes(mode)) {
    sendJson(res, 400, { error: 'Invalid mode. Must be: exclusive, shared' });
    return;
  }

  try {
    const result = acquireLock(
      session_id,
      lock_type as 'file' | 'branch' | 'resource',
      target,
      mode as 'exclusive' | 'shared'
    );
    sendJson(res, 200, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] Acquire lock error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to acquire lock' });
  }
}

// DELETE /coordination/locks
async function handleReleaseLock(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const session_id = url.searchParams.get('session_id');
  const lock_type = url.searchParams.get('lock_type');
  const target = url.searchParams.get('target');

  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required query param: session_id' });
    return;
  }

  try {
    if (lock_type && target) {
      // Release specific lock
      const released = releaseLock(
        session_id,
        lock_type as 'file' | 'branch' | 'resource',
        target
      );
      sendJson(res, 200, { success: true, released: released ? 1 : 0 });
    } else {
      // Release all locks for session
      const released = releaseAllLocks(session_id);
      sendJson(res, 200, { success: true, released });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] Release lock error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to release lock' });
  }
}

// GET /coordination/locks
async function handleListLocks(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const session_id = url.searchParams.get('session_id');

  if (!session_id) {
    sendJson(res, 400, { error: 'Missing required query param: session_id' });
    return;
  }

  try {
    const locks = getSessionLocks(session_id);
    sendJson(res, 200, { locks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[coordination] List locks error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to list locks' });
  }
}

// Main router for /coordination/* paths
export async function handleCoordinationRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  method: string
): Promise<boolean> {
  // Sessions routes
  if (path === '/coordination/sessions') {
    if (method === 'POST') {
      await handleCreateSession(req, res);
      return true;
    }
    if (method === 'GET') {
      await handleListSessions(req, res);
      return true;
    }
  }

  // Session by ID routes
  const sessionMatch = path.match(/^\/coordination\/sessions\/([^/]+)$/);
  if (sessionMatch) {
    const id = decodeURIComponent(sessionMatch[1]);
    if (method === 'GET') {
      await handleGetSession(id, res);
      return true;
    }
    if (method === 'PATCH') {
      await handleUpdateSession(id, req, res);
      return true;
    }
    if (method === 'DELETE') {
      await handleDeleteSession(id, res);
      return true;
    }
  }

  // Check route
  if (path === '/coordination/check' && method === 'POST') {
    await handleCheck(req, res);
    return true;
  }

  // Locks routes
  if (path === '/coordination/locks') {
    if (method === 'POST') {
      await handleAcquireLock(req, res);
      return true;
    }
    if (method === 'DELETE') {
      await handleReleaseLock(req, res);
      return true;
    }
    if (method === 'GET') {
      await handleListLocks(req, res);
      return true;
    }
  }

  return false;
}
