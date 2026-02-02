import type { IncomingMessage, ServerResponse } from 'http';
import { sessionManager } from './session-manager';
import type { SpawnRequest, SessionStatus } from './types';

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

// POST /claude-code/spawn
export async function handleClaudeCodeSpawn(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: SpawnRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  // Validate required fields
  if (!body.prompt || typeof body.prompt !== 'string') {
    sendJson(res, 400, { error: 'prompt is required' });
    return;
  }
  if (!body.cwd || typeof body.cwd !== 'string') {
    sendJson(res, 400, { error: 'cwd is required' });
    return;
  }

  // Validate cwd
  if (!sessionManager.validateCwd(body.cwd)) {
    sendJson(res, 403, {
      error: 'cwd not in allowlist',
      allowed: sessionManager.getAllowedCwds()
    });
    return;
  }

  // Check concurrent limit
  if (!sessionManager.canSpawn()) {
    sendJson(res, 429, {
      error: 'Max concurrent sessions reached',
      retryAfter: 60
    });
    return;
  }

  // Validate model if provided
  if (body.model && !['sonnet', 'opus', 'haiku'].includes(body.model)) {
    sendJson(res, 400, {
      error: 'Invalid model',
      allowed: ['sonnet', 'opus', 'haiku']
    });
    return;
  }

  try {
    const session = await sessionManager.spawn(body);
    sendJson(res, 202, {
      sessionId: session.id,
      status: session.status,
      createdAt: session.createdAt
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[claude-code] Spawn error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to spawn session' });
  }
}

// GET /claude-code/sessions
export async function handleClaudeCodeList(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const status = url.searchParams.get('status') as SessionStatus | null;

  const sessions = sessionManager.listSessions(status ?? undefined);
  sendJson(res, 200, {
    sessions: sessions.map(s => ({
      id: s.id,
      status: s.status,
      cwd: s.cwd,
      model: s.model,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
      exitCode: s.exitCode
    }))
  });
}

// GET /claude-code/sessions/:id
export async function handleClaudeCodeGet(res: ServerResponse, sessionId: string): Promise<void> {
  const result = sessionManager.getSessionResult(sessionId);
  if (!result) {
    sendJson(res, 404, { error: 'Session not found' });
    return;
  }
  sendJson(res, 200, result);
}

// DELETE /claude-code/sessions/:id
export async function handleClaudeCodeKill(res: ServerResponse, sessionId: string): Promise<void> {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    sendJson(res, 404, { error: 'Session not found' });
    return;
  }

  if (!['pending', 'running'].includes(session.status)) {
    sendJson(res, 400, { error: 'Session is not running' });
    return;
  }

  const killed = sessionManager.killSession(sessionId);
  if (!killed) {
    sendJson(res, 500, { error: 'Failed to kill session' });
    return;
  }

  sendJson(res, 200, { success: true });
}

// POST /claude-code/cleanup
export async function handleClaudeCodeCleanup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let maxAgeHours = 24;

  try {
    const rawBody = await readBody(req);
    if (rawBody) {
      const body = JSON.parse(rawBody);
      if (typeof body.maxAgeHours === 'number') {
        maxAgeHours = body.maxAgeHours;
      }
    }
  } catch {
    // Use default
  }

  const result = sessionManager.cleanup(maxAgeHours);
  sendJson(res, 200, result);
}

/**
 * Route handler for /claude-code/* paths.
 * Returns true if handled, false for 404.
 */
export async function handleClaudeCodeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  method: string
): Promise<boolean> {
  // POST /claude-code/spawn
  if (path === '/claude-code/spawn' && method === 'POST') {
    await handleClaudeCodeSpawn(req, res);
    return true;
  }

  // GET /claude-code/sessions
  if (path === '/claude-code/sessions' && method === 'GET') {
    await handleClaudeCodeList(req, res);
    return true;
  }

  // POST /claude-code/cleanup
  if (path === '/claude-code/cleanup' && method === 'POST') {
    await handleClaudeCodeCleanup(req, res);
    return true;
  }

  // GET/DELETE /claude-code/sessions/:id
  const sessionMatch = path.match(/^\/claude-code\/sessions\/([a-f0-9-]+)$/);
  if (sessionMatch) {
    const sessionId = sessionMatch[1];
    if (method === 'GET') {
      await handleClaudeCodeGet(res, sessionId);
      return true;
    }
    if (method === 'DELETE') {
      await handleClaudeCodeKill(res, sessionId);
      return true;
    }
  }

  return false;
}
