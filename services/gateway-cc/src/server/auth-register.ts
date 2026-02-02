import type { IncomingMessage, ServerResponse } from 'http';
import { randomBytes } from 'crypto';
import { getDb } from '../db/migrate';

const TEAM_REGISTRATION_SECRET = process.env.TEAM_REGISTRATION_SECRET;

interface RegisterRequest {
  username: string;
  machine: string;
}

interface RegisteredClient {
  id: string;
  token: string;
  username: string;
  machine: string;
  created_at: string;
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

function generateToken(): string {
  return `cc_${randomBytes(32).toString('hex')}`;
}

function generateClientId(username: string, machine: string): string {
  const base = `${username}-${machine}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const suffix = randomBytes(4).toString('hex');
  return `${base}-${suffix}`;
}

/**
 * Register a new client via team secret.
 * POST /auth/register
 * Headers: X-Team-Secret
 * Body: { username, machine }
 * Returns: { token, client_id }
 */
export async function handleAuthRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Verify team secret
  if (!TEAM_REGISTRATION_SECRET) {
    sendJson(res, 503, { error: 'Registration not configured on this gateway' });
    return;
  }

  const teamSecret = req.headers['x-team-secret'];
  if (!teamSecret || teamSecret !== TEAM_REGISTRATION_SECRET) {
    sendJson(res, 401, { error: 'Invalid team secret' });
    return;
  }

  // Parse body
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

  // Check for existing registration
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM clients WHERE username = ? AND machine = ?')
    .get(username, machine) as RegisteredClient | undefined;

  if (existing) {
    // Return existing token
    console.log(`[gateway-cc] Returning existing client: ${existing.id} for ${username}@${machine}`);
    sendJson(res, 200, {
      token: existing.token,
      client_id: existing.id,
      message: 'Existing registration returned',
    });
    return;
  }

  // Create new client
  const clientId = generateClientId(username, machine);
  const token = generateToken();

  try {
    db.prepare(
      `INSERT INTO clients (id, token, username, machine, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(clientId, token, username, machine);

    console.log(`[gateway-cc] Registered new client: ${clientId} for ${username}@${machine}`);

    sendJson(res, 201, {
      token,
      client_id: clientId,
      message: 'Client registered successfully',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Registration error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to register client' });
  }
}

/**
 * Get client by token from the clients table.
 */
export function getRegisteredClientByToken(token: string): RegisteredClient | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM clients WHERE token = ?').get(token) as RegisteredClient | undefined;
}

/**
 * List all registered clients.
 */
export function listRegisteredClients(): RegisteredClient[] {
  const db = getDb();
  return db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all() as RegisteredClient[];
}
