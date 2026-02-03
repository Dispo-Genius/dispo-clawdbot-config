import type { IncomingMessage, ServerResponse } from 'http';

const TEAM_REGISTRATION_SECRET = process.env.TEAM_REGISTRATION_SECRET;
const TEAM_OPS_TOKEN = process.env.TEAM_OPS_TOKEN;

interface RegisterRequest {
  username: string;
  machine: string;
}

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

/**
 * Register a new client via team secret.
 * POST /auth/register
 * Headers: X-Team-Secret
 * Body: { username, machine }
 * Returns: { token } - the shared team ops_ token
 *
 * Security: Requires Tailscale network access + team secret.
 * The returned ops_ token is shared by all team members.
 */
export async function handleAuthRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Verify gateway is configured
  if (!TEAM_REGISTRATION_SECRET || !TEAM_OPS_TOKEN) {
    sendJson(res, 503, { error: 'Registration not configured on this gateway' });
    return;
  }

  // Verify team secret
  const teamSecret = req.headers['x-team-secret'];
  if (!teamSecret || teamSecret !== TEAM_REGISTRATION_SECRET) {
    sendJson(res, 401, { error: 'Invalid team secret' });
    return;
  }

  // Parse body for audit logging
  let body: RegisterRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { username, machine } = body;

  if (!username || !machine) {
    sendJson(res, 400, { error: 'Missing required fields: username, machine' });
    return;
  }

  // Log registration for audit
  console.log(`[gateway-cc] Token issued to ${username}@${machine} at ${new Date().toISOString()}`);

  // Return the shared team token
  sendJson(res, 200, {
    token: TEAM_OPS_TOKEN,
    message: 'Registration successful',
  });
}
