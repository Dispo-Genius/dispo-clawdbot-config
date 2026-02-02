import type { IncomingMessage, ServerResponse } from 'http';
import * as https from 'https';
import { spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { Webhook } from 'svix';
import { authenticateRequest } from './auth';
import { getService, listServices } from '../config/loader';
import { isKilled } from '../middleware/killswitch';
import { checkRateLimit, releaseConcurrency } from '../middleware/ratelimit';
import { execLocalCapture } from '../exec/runner';
import { logExecution } from '../logging/logger';
import { storeEvent, getEvents, type WebhookEventInput } from '../db/webhooks';
import { handleCoordinationRequest } from '../coordination';
import { setProfileCredential, listProfileCredentials, deleteProfileCredential } from '../utils/keychain';
import { handleAuthRegister } from './auth-register';
import {
  selectAccount,
  getAllAccountsStatus,
  getAllAccounts,
  updateAccount,
  initializeFromCCS,
  getStorePath,
} from '../account-selector';

// Anthropic API key for proxy
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Webhook signature verification
const AGENTMAIL_WEBHOOK_SECRET = process.env.AGENTMAIL_WEBHOOK_SECRET;

interface ExecRequest {
  service: string;
  command: string;
  args?: string[];
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
      // Limit body size to 1MB
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleHealth(res: ServerResponse): Promise<void> {
  const services = listServices();
  sendJson(res, 200, {
    status: 'ok',
    version: '1.0.0',
    services: services.map((s) => ({
      name: s.name,
      enabled: s.enabled,
    })),
  });
}

async function handleExec(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Authenticate
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    sendJson(res, auth.statusCode ?? 401, { error: auth.error });
    return;
  }

  const client = auth.client!;

  // Parse body
  let body: ExecRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { service: serviceName, command, args = [] } = body;

  if (!serviceName || !command) {
    sendJson(res, 400, { error: 'Missing required fields: service, command' });
    return;
  }

  // Resolve service
  const svc = getService(serviceName);
  if (!svc) {
    const available = listServices().map((s) => s.name);
    sendJson(res, 404, {
      error: `Unknown service "${serviceName}"`,
      available,
    });
    return;
  }

  // Check enabled
  if (!svc.enabled) {
    sendJson(res, 503, { error: `Service "${serviceName}" is disabled` });
    return;
  }

  // Kill switch (service-level)
  const ks = isKilled(serviceName);
  if (ks.killed) {
    sendJson(res, 503, {
      error: `Service "${serviceName}" is killed`,
      reason: ks.reason,
    });
    return;
  }

  // Rate limit
  const rl = checkRateLimit(serviceName, svc.rateLimit);
  if (!rl.allowed) {
    const retryAfter = rl.retryAfterMs ? Math.ceil(rl.retryAfterMs / 1000) : 60;
    res.setHeader('Retry-After', retryAfter.toString());
    sendJson(res, 429, {
      error: `Rate limit exceeded for service "${serviceName}"`,
      retryAfterMs: rl.retryAfterMs,
    });
    return;
  }

  // Execute - always use local execution on server (it IS the gateway)
  // Force local execution by temporarily overriding the config
  const localConfig = { ...svc, execution: { type: 'local' as const } };
  console.log(`[gateway-cc] ${client.name} -> ${serviceName}/${command} ${args.join(' ')}`);

  try {
    const result = await execLocalCapture(localConfig, command, args, client);
    if (svc.rateLimit.type === 'concurrency') {
      releaseConcurrency(serviceName);
    }
    logExecution(serviceName, command, result.exitCode, result.durationMs, client.id);

    // Return output as plain text with exit code in header
    res.setHeader('X-Exit-Code', result.exitCode.toString());
    res.setHeader('X-Duration-Ms', result.durationMs.toString());
    res.writeHead(result.exitCode === 0 ? 200 : 500, { 'Content-Type': 'text/plain' });
    res.end(result.output ?? '');
  } catch (err) {
    if (svc.rateLimit.type === 'concurrency') {
      releaseConcurrency(serviceName);
    }
    const msg = err instanceof Error ? err.message : String(err);
    logExecution(serviceName, command, 1, null, client.id);

    res.setHeader('X-Exit-Code', '1');
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Error: ${msg}`);
  }
}

async function handleServices(res: ServerResponse): Promise<void> {
  const services = listServices();
  sendJson(res, 200, {
    services: services.map((s) => ({
      name: s.name,
      tool: s.tool,
      enabled: s.enabled,
      rateLimit: s.rateLimit,
    })),
  });
}

// Process incoming email via Polaris (fire-and-forget)
function processEmailAsync(event: WebhookEventInput): void {
  // Extract from AgentMail webhook structure: event.message.message_id
  const messageId = event.message_id || event.message?.message_id;
  const mailboxId = event.mailbox_id || event.message?.inbox_id || 'amusedbattle808@agentmail.to';

  if (!messageId) {
    console.log('[gateway-cc] No message_id in event, skipping processing. Keys:', Object.keys(event));
    return;
  }

  console.log(`[gateway-cc] Processing email ${messageId} via Polaris...`);

  // Spawn polaris-cc email-handler to process this specific message
  const polarisPath = path.join(os.homedir(), '.claude/services/polaris-cc/src/index.ts');
  const child = spawn('npx', [
    'tsx',
    polarisPath,
    'email-handler',
    '--message-id', messageId,
    '--mailbox-id', mailboxId,
  ], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
}

async function handleWebhookAgentmail(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Read raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await readBody(req);
  } catch {
    sendJson(res, 400, { error: 'Failed to read request body' });
    return;
  }

  // Verify webhook signature if secret is configured
  if (AGENTMAIL_WEBHOOK_SECRET) {
    const svixId = req.headers['svix-id'] as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSignature = req.headers['svix-signature'] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.log('[gateway-cc] Webhook rejected: missing svix headers');
      sendJson(res, 401, { error: 'Missing webhook signature headers' });
      return;
    }

    try {
      const wh = new Webhook(AGENTMAIL_WEBHOOK_SECRET);
      wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
      console.log('[gateway-cc] Webhook signature verified');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[gateway-cc] Webhook signature verification failed: ${msg}`);
      sendJson(res, 401, { error: 'Invalid webhook signature' });
      return;
    }
  } else {
    console.log('[gateway-cc] Warning: AGENTMAIL_WEBHOOK_SECRET not set, skipping signature verification');
  }

  // Parse body
  let body: WebhookEventInput;
  try {
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!body.event_type) {
    sendJson(res, 400, { error: 'Missing required field: event_type' });
    return;
  }

  try {
    const id = storeEvent(body);
    console.log(`[gateway-cc] Webhook received: ${body.event_type} (id=${id})`);

    // If it's a message.received event, process it immediately
    if (body.event_type === 'message.received') {
      processEmailAsync(body);
    }

    sendJson(res, 200, { status: 'received', id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Webhook storage error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to store event' });
  }
}

async function handleWebhookEvents(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const since = url.searchParams.get('since') ?? undefined;
  const mailbox_id = url.searchParams.get('mailbox_id') ?? undefined;
  const limitStr = url.searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 100;

  try {
    const events = getEvents({ since, mailbox_id, limit });
    sendJson(res, 200, { events, count: events.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Webhook events query error: ${msg}`);
    sendJson(res, 500, { error: 'Failed to query events' });
  }
}

// --- Profile credential management endpoints ---

interface KeySetRequest {
  key: string;
  value: string;
}

interface KeyDeleteRequest {
  key: string;
}

async function handleKeysSet(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    sendJson(res, auth.statusCode ?? 401, { error: auth.error });
    return;
  }

  const client = auth.client!;
  const profile = client.profile;

  let body: KeySetRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!body.key || !body.value) {
    sendJson(res, 400, { error: 'Missing required fields: key, value' });
    return;
  }

  try {
    setProfileCredential(profile, body.key, body.value);
    console.log(`[gateway-cc] ${client.name} set credential ${body.key} for profile ${profile}`);
    sendJson(res, 200, { status: 'ok', profile, key: body.key });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Failed to set credential: ${msg}`);
    sendJson(res, 500, { error: `Failed to set credential: ${msg}` });
  }
}

async function handleKeysList(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    sendJson(res, auth.statusCode ?? 401, { error: auth.error });
    return;
  }

  const client = auth.client!;
  const profile = client.profile;

  try {
    const keys = listProfileCredentials(profile);
    sendJson(res, 200, { profile, keys });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Failed to list credentials: ${msg}`);
    sendJson(res, 500, { error: `Failed to list credentials: ${msg}` });
  }
}

async function handleKeysDelete(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    sendJson(res, auth.statusCode ?? 401, { error: auth.error });
    return;
  }

  const client = auth.client!;
  const profile = client.profile;

  let body: KeyDeleteRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!body.key) {
    sendJson(res, 400, { error: 'Missing required field: key' });
    return;
  }

  try {
    const deleted = deleteProfileCredential(profile, body.key);
    if (deleted) {
      console.log(`[gateway-cc] ${client.name} deleted credential ${body.key} from profile ${profile}`);
      sendJson(res, 200, { status: 'ok', profile, key: body.key });
    } else {
      sendJson(res, 404, { error: `Key ${body.key} not found in profile ${profile}` });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Failed to delete credential: ${msg}`);
    sendJson(res, 500, { error: `Failed to delete credential: ${msg}` });
  }
}

/**
 * Proxy requests to Anthropic API.
 * Authenticates via gateway Bearer token, then injects ANTHROPIC_API_KEY.
 * Rate limits per client.
 */
async function handleAnthropicProxy(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Authenticate client
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    sendJson(res, auth.statusCode ?? 401, { error: auth.error });
    return;
  }

  const client = auth.client!;

  // Check API key is configured
  if (!ANTHROPIC_API_KEY) {
    sendJson(res, 503, { error: 'ANTHROPIC_API_KEY not configured on gateway' });
    return;
  }

  // Rate limit per client (use anthropic:clientId as service name)
  const rateLimitService = `anthropic:${client.id}`;
  const rl = checkRateLimit(rateLimitService, { type: 'rpm', limit: client.rateLimit.rpm });
  if (!rl.allowed) {
    const retryAfter = rl.retryAfterMs ? Math.ceil(rl.retryAfterMs / 1000) : 60;
    res.setHeader('Retry-After', retryAfter.toString());
    sendJson(res, 429, {
      error: `Rate limit exceeded for Anthropic proxy`,
      retryAfterMs: rl.retryAfterMs,
    });
    return;
  }

  // Extract path after /anthropic (e.g., /anthropic/v1/messages -> /v1/messages)
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const anthropicPath = url.pathname.replace(/^\/anthropic/, '');

  // Read request body
  let body: string;
  try {
    body = await readBody(req);
  } catch (err) {
    sendJson(res, 400, { error: 'Failed to read request body' });
    return;
  }

  console.log(`[gateway-cc] ${client.name} -> anthropic${anthropicPath}`);

  // Forward to Anthropic
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': (req.headers['anthropic-version'] as string) || '2023-06-01',
  };

  // Copy Content-Length if present
  if (req.headers['content-length']) {
    headers['Content-Length'] = req.headers['content-length'] as string;
  }

  const options: https.RequestOptions = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: anthropicPath,
    method: req.method,
    headers,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Copy status and headers from Anthropic response
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

    // Stream response
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[gateway-cc] Anthropic proxy error: ${err.message}`);
    if (!res.headersSent) {
      sendJson(res, 502, { error: `Anthropic proxy error: ${err.message}` });
    }
  });

  // Send body
  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

// --- Account selector endpoints ---

interface UsageUpdateRequest {
  account: string;
  usagePercent: number;
  notes?: string;
}

interface InitRequest {
  ccsInstancesPath: string;
}

/**
 * GET /account-selector/select
 * Returns the optimal account to use based on urgency algorithm
 */
async function handleAccountSelectorSelect(res: ServerResponse): Promise<void> {
  try {
    const accounts = getAllAccounts();

    if (accounts.length === 0) {
      sendJson(res, 404, {
        error: 'No accounts configured',
        hint: 'POST /account-selector/init to initialize from CCS instances',
      });
      return;
    }

    const selection = selectAccount(accounts);

    if (!selection) {
      sendJson(res, 503, { error: 'No accounts available' });
      return;
    }

    console.log(`[gateway-cc] Account selected: ${selection.account} (urgency: ${selection.urgency})`);
    sendJson(res, 200, selection);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Account selection error: ${msg}`);
    sendJson(res, 500, { error: `Account selection failed: ${msg}` });
  }
}

/**
 * GET /account-selector/status
 * Returns status of all accounts
 */
async function handleAccountSelectorStatus(res: ServerResponse): Promise<void> {
  try {
    const accounts = getAllAccounts();
    const status = getAllAccountsStatus(accounts);

    sendJson(res, 200, {
      ...status,
      storePath: getStorePath(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Account status error: ${msg}`);
    sendJson(res, 500, { error: `Failed to get account status: ${msg}` });
  }
}

/**
 * POST /account-selector/usage
 * Update usage percentage for an account
 */
async function handleAccountSelectorUsage(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: UsageUpdateRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!body.account || body.usagePercent === undefined) {
    sendJson(res, 400, { error: 'Missing required fields: account, usagePercent' });
    return;
  }

  if (body.usagePercent < 0 || body.usagePercent > 100) {
    sendJson(res, 400, { error: 'usagePercent must be between 0 and 100' });
    return;
  }

  try {
    const account = updateAccount(body.account, {
      usagePercent: body.usagePercent,
      notes: body.notes,
    });

    console.log(`[gateway-cc] Updated ${body.account} usage: ${body.usagePercent}%`);
    sendJson(res, 200, { status: 'ok', account });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Usage update error: ${msg}`);
    sendJson(res, 500, { error: `Failed to update usage: ${msg}` });
  }
}

/**
 * POST /account-selector/init
 * Initialize accounts from CCS instances directory
 */
async function handleAccountSelectorInit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: InitRequest;
  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!body.ccsInstancesPath) {
    sendJson(res, 400, { error: 'Missing required field: ccsInstancesPath' });
    return;
  }

  try {
    const accounts = initializeFromCCS(body.ccsInstancesPath);
    console.log(`[gateway-cc] Initialized ${accounts.length} accounts from ${body.ccsInstancesPath}`);
    sendJson(res, 200, {
      status: 'ok',
      initialized: accounts.length,
      accounts: accounts.map((a) => ({ id: a.id, resetTime: a.resetTime })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[gateway-cc] Init error: ${msg}`);
    sendJson(res, 500, { error: `Failed to initialize accounts: ${msg}` });
  }
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method?.toUpperCase();

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Routes
  if (path === '/health' && method === 'GET') {
    return handleHealth(res);
  }

  if (path === '/services' && method === 'GET') {
    return handleServices(res);
  }

  // Team registration (no auth required - uses team secret)
  if (path === '/auth/register' && method === 'POST') {
    return handleAuthRegister(req, res);
  }

  if (path === '/exec' && method === 'POST') {
    return handleExec(req, res);
  }

  if (path === '/webhook/agentmail' && method === 'POST') {
    return handleWebhookAgentmail(req, res);
  }

  if (path === '/webhook/agentmail/events' && method === 'GET') {
    return handleWebhookEvents(req, res);
  }

  // Anthropic proxy: /anthropic/*
  if (path.startsWith('/anthropic/') && method === 'POST') {
    return handleAnthropicProxy(req, res);
  }

  // Profile credential management: /keys/*
  if (path === '/keys/set' && method === 'POST') {
    return handleKeysSet(req, res);
  }

  if (path === '/keys/list' && method === 'GET') {
    return handleKeysList(req, res);
  }

  if (path === '/keys/delete' && method === 'DELETE') {
    return handleKeysDelete(req, res);
  }

  // Coordination endpoints: /coordination/*
  if (path.startsWith('/coordination/')) {
    const auth = authenticateRequest(req);
    if (!auth.authenticated) {
      sendJson(res, auth.statusCode ?? 401, { error: auth.error });
      return;
    }
    const handled = await handleCoordinationRequest(req, res, path, method ?? 'GET');
    if (handled) {
      return;
    }
  }

  // Account selector endpoints: /account-selector/*
  if (path === '/account-selector/select' && method === 'GET') {
    return handleAccountSelectorSelect(res);
  }

  if (path === '/account-selector/status' && method === 'GET') {
    return handleAccountSelectorStatus(res);
  }

  if (path === '/account-selector/usage' && method === 'POST') {
    return handleAccountSelectorUsage(req, res);
  }

  if (path === '/account-selector/init' && method === 'POST') {
    return handleAccountSelectorInit(req, res);
  }

  // 404
  sendJson(res, 404, {
    error: 'Not found',
    endpoints: [
      'GET  /health                    - Health check',
      'GET  /services                  - List available services',
      'POST /exec                      - Execute service command',
      'POST /webhook/agentmail         - Receive AgentMail webhooks',
      'GET  /webhook/agentmail/events  - Query stored webhook events',
      'POST /anthropic/*               - Proxy to Anthropic API',
      'POST /keys/set                  - Set credential for client profile',
      'GET  /keys/list                 - List credentials for client profile',
      'DELETE /keys/delete             - Delete credential from client profile',
      'POST /coordination/sessions     - Register session',
      'GET  /coordination/sessions     - List sessions',
      'PATCH /coordination/sessions/:id - Update session',
      'DELETE /coordination/sessions/:id - Delete session',
      'POST /coordination/check        - Check for conflicts',
      'POST /coordination/locks        - Acquire lock',
      'DELETE /coordination/locks      - Release lock(s)',
      'GET  /coordination/locks        - List locks',
      'GET  /account-selector/select   - Get optimal account to use',
      'GET  /account-selector/status   - Get all accounts status',
      'POST /account-selector/usage    - Update account usage %',
      'POST /account-selector/init     - Initialize from CCS instances',
    ],
  });
}
