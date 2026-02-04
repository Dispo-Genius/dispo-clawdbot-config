#!/usr/bin/env npx tsx
/**
 * Local Account Selector
 *
 * Fetches OAuth usage from Anthropic API using local macOS keychain credentials.
 * No 1Password dependency - reads tokens directly from keychain.
 *
 * Usage: npx tsx src/index.ts [select|status|refresh]
 *
 * Output (JSON):
 * {
 *   "account": "account1",
 *   "email": "user@example.com",
 *   "fiveHour": { "utilization": 25, "resetsAt": "2024-..." },
 *   "sevenDay": { "utilization": 10, "resetsAt": "2024-..." },
 *   "credential": "..." // full JSON blob for cc.sh to inject
 * }
 */

import * as https from 'https';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// Account metadata (static, from cc.sh)
const ACCOUNT_METADATA: Record<string, { email: string; displayName: string }> = {
  account1: { email: 'andyrongdg@gmail.com', displayName: 'Andres' },
  account2: { email: 'andy@dispogenius.io', displayName: 'Andy' },
  account3: { email: 'polaris@support.dispogenius.io', displayName: 'Polaris' },
};

const ACCOUNT_IDS = ['account1', 'account2', 'account3'];

interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string;
  rateLimitTier: string;
}

interface UsageWindow {
  utilization: number;
  resets_at: string | null;
}

interface OAuthUsageResponse {
  five_hour: UsageWindow;
  seven_day: UsageWindow;
}

interface AccountWithUsage {
  id: string;
  email: string;
  fiveHour: { utilization: number; resetsAt: string | null };
  sevenDay: { utilization: number; resetsAt: string | null };
  credential: string; // Full JSON blob for injection
}

/**
 * Compute keychain service name from config dir
 */
function computeKeychainService(configDir: string): string {
  const hash = createHash('sha256').update(configDir).digest('hex').slice(0, 8);
  return `Claude Code-credentials-${hash}`;
}

/**
 * Read credentials from macOS keychain
 */
function readKeychainCredentials(accountId: string): string | null {
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.ccs', 'instances', accountId);
  const service = computeKeychainService(configDir);

  try {
    const result = execSync(
      `security find-generic-password -s "${service}" -w 2>/dev/null`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Write credentials to macOS keychain
 */
function writeKeychainCredentials(accountId: string, credential: string): boolean {
  const homeDir = os.homedir();
  const configDir = path.join(homeDir, '.ccs', 'instances', accountId);
  const service = computeKeychainService(configDir);
  const username = os.userInfo().username;

  try {
    // Delete existing first (security add-generic-password -U doesn't always work)
    try {
      execSync(`security delete-generic-password -s "${service}" 2>/dev/null`, { stdio: 'pipe' });
    } catch {
      // Ignore if doesn't exist
    }

    // Add new credential - escape single quotes in the credential
    const escapedCred = credential.replace(/'/g, "'\\''");
    execSync(
      `security add-generic-password -s "${service}" -a "${username}" -w '${escapedCred}'`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (err) {
    console.error(`[account-selector] Failed to write keychain for ${accountId}:`, err);
    return false;
  }
}

/**
 * Parse OAuth credentials from keychain JSON
 */
function parseCredentials(json: string): OAuthCredentials | null {
  try {
    const data = JSON.parse(json);
    const oauth = data.claudeAiOauth;
    if (!oauth?.accessToken) {
      return null;
    }
    return {
      accessToken: oauth.accessToken,
      refreshToken: oauth.refreshToken || '',
      expiresAt: oauth.expiresAt || 0,
      scopes: oauth.scopes || [],
      subscriptionType: oauth.subscriptionType || 'unknown',
      rateLimitTier: oauth.rateLimitTier || 'unknown',
    };
  } catch {
    return null;
  }
}

/**
 * Serialize credentials back to keychain format
 */
function serializeCredentials(creds: OAuthCredentials): string {
  return JSON.stringify({
    claudeAiOauth: {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      expiresAt: creds.expiresAt,
      scopes: creds.scopes,
      subscriptionType: creds.subscriptionType,
      rateLimitTier: creds.rateLimitTier,
    },
  });
}

/**
 * Refresh OAuth token
 */
async function refreshToken(refreshToken: string): Promise<OAuthCredentials | null> {
  return new Promise((resolve) => {
    const clientId = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${clientId}`;

    const req = https.request(
      {
        hostname: 'console.anthropic.com',
        path: '/v1/oauth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`[account-selector] Token refresh failed ${res.statusCode}: ${data}`);
            resolve(null);
            return;
          }
          try {
            const resp = JSON.parse(data);
            resolve({
              accessToken: resp.access_token,
              refreshToken: resp.refresh_token || refreshToken,
              expiresAt: Date.now() + resp.expires_in * 1000,
              scopes: resp.scope?.split(' ') || [],
              subscriptionType: 'unknown',
              rateLimitTier: 'unknown',
            });
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

/**
 * Fetch usage from Anthropic API
 */
async function fetchUsage(accessToken: string): Promise<{ usage: OAuthUsageResponse | null; tokenExpired: boolean }> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 401) {
            try {
              const error = JSON.parse(data);
              const isExpired =
                error?.error?.details?.error_code === 'token_expired' ||
                error?.error?.message?.includes('expired');
              resolve({ usage: null, tokenExpired: isExpired });
            } catch {
              resolve({ usage: null, tokenExpired: false });
            }
            return;
          }
          if (res.statusCode !== 200) {
            console.error(`[account-selector] API returned ${res.statusCode}: ${data}`);
            resolve({ usage: null, tokenExpired: false });
            return;
          }
          try {
            resolve({ usage: JSON.parse(data), tokenExpired: false });
          } catch {
            resolve({ usage: null, tokenExpired: false });
          }
        });
      }
    );

    req.on('error', () => resolve({ usage: null, tokenExpired: false }));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ usage: null, tokenExpired: false });
    });
    req.end();
  });
}

/**
 * Get usage for a single account with token refresh
 */
async function getAccountUsage(accountId: string): Promise<AccountWithUsage | null> {
  const credentialJson = readKeychainCredentials(accountId);
  if (!credentialJson) {
    console.error(`[account-selector] No credentials for ${accountId}`);
    return null;
  }

  let credentials = parseCredentials(credentialJson);
  if (!credentials) {
    console.error(`[account-selector] Invalid credentials for ${accountId}`);
    return null;
  }

  // Try to fetch usage
  let result = await fetchUsage(credentials.accessToken);

  // If token expired, try refresh
  if (result.tokenExpired && credentials.refreshToken) {
    console.error(`[account-selector] Token expired for ${accountId}, refreshing...`);
    const newCreds = await refreshToken(credentials.refreshToken);
    if (newCreds) {
      // Preserve subscription info
      newCreds.subscriptionType = credentials.subscriptionType;
      newCreds.rateLimitTier = credentials.rateLimitTier;
      credentials = newCreds;

      // Save refreshed token to keychain
      const newCredJson = serializeCredentials(newCreds);
      if (writeKeychainCredentials(accountId, newCredJson)) {
        console.error(`[account-selector] Token refreshed for ${accountId}`);
      }

      // Retry with new token
      result = await fetchUsage(credentials.accessToken);
    }
  }

  if (!result.usage) {
    return null;
  }

  const meta = ACCOUNT_METADATA[accountId] || { email: 'unknown', displayName: 'Unknown' };

  return {
    id: accountId,
    email: meta.email,
    fiveHour: {
      utilization: result.usage.five_hour.utilization,
      resetsAt: result.usage.five_hour.resets_at,
    },
    sevenDay: {
      utilization: result.usage.seven_day.utilization,
      resetsAt: result.usage.seven_day.resets_at,
    },
    credential: serializeCredentials(credentials),
  };
}

/**
 * Calculate urgency score (higher = more urgent to use)
 */
function calculateUrgency(usage: AccountWithUsage): number {
  const remaining = 100 - usage.fiveHour.utilization;
  if (remaining <= 0) return 0;

  // Calculate hours until reset
  let hoursUntilReset = 5; // default
  if (usage.fiveHour.resetsAt) {
    const resetTime = new Date(usage.fiveHour.resetsAt).getTime();
    const now = Date.now();
    hoursUntilReset = Math.max(0.1, (resetTime - now) / (1000 * 60 * 60));
  }

  return remaining / hoursUntilReset;
}

/**
 * Select optimal account based on usage
 */
async function selectAccount(): Promise<void> {
  const usages: AccountWithUsage[] = [];

  // Fetch usage for all accounts in parallel
  const results = await Promise.all(ACCOUNT_IDS.map(getAccountUsage));

  for (const result of results) {
    if (result) {
      usages.push(result);
    }
  }

  if (usages.length === 0) {
    console.log(JSON.stringify({ error: 'Could not fetch usage from any account' }));
    return;
  }

  // Filter out exhausted accounts (100% usage)
  const available = usages.filter(u => u.fiveHour.utilization < 100);

  let selected: AccountWithUsage;
  if (available.length > 0) {
    // Select highest urgency
    selected = available.reduce((best, curr) =>
      calculateUrgency(curr) > calculateUrgency(best) ? curr : best
    );
  } else {
    // All exhausted - pick one that resets soonest
    selected = usages.reduce((best, curr) => {
      const bestReset = best.fiveHour.resetsAt ? new Date(best.fiveHour.resetsAt).getTime() : Infinity;
      const currReset = curr.fiveHour.resetsAt ? new Date(curr.fiveHour.resetsAt).getTime() : Infinity;
      return currReset < bestReset ? curr : best;
    });
  }

  console.log(JSON.stringify({
    account: selected.id,
    email: selected.email,
    fiveHour: selected.fiveHour,
    sevenDay: selected.sevenDay,
    credential: selected.credential,
  }));
}

/**
 * Show status of all accounts
 */
async function showStatus(): Promise<void> {
  const results = await Promise.all(ACCOUNT_IDS.map(getAccountUsage));

  const accounts = results
    .filter((r): r is AccountWithUsage => r !== null)
    .map(u => ({
      id: u.id,
      email: u.email,
      fiveHour: u.fiveHour,
      sevenDay: u.sevenDay,
      urgency: calculateUrgency(u),
    }))
    .sort((a, b) => b.urgency - a.urgency);

  console.log(JSON.stringify({ accounts }));
}

// Main
const command = process.argv[2] || 'select';

switch (command) {
  case 'select':
    selectAccount();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
}
