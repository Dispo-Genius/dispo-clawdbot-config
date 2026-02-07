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

interface SelectionState {
  lastSelectedAccount: string | null;
  lastSelectedAt: string;
  selectionHistory: Array<{
    account: string;
    timestamp: string;
    fiveHour: number;
    sevenDay: number;
  }>;
}

const STATE_FILE = path.join(os.homedir(), '.cc', 'account-selection-state.json');
const HISTORY_SIZE = 10;

function loadSelectionState(): SelectionState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    // Invalid state file, return default
  }
  return {
    lastSelectedAccount: null,
    lastSelectedAt: new Date().toISOString(),
    selectionHistory: [],
  };
}

function saveSelectionState(state: SelectionState): void {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Failed to save selection state:', e);
  }
}

/**
 * Discover accounts dynamically from ~/.ccs/instances/
 * An account is valid if its directory has a .claude.json with oauthAccount metadata
 */
function discoverAccounts(): string[] {
  const instancesDir = path.join(os.homedir(), '.ccs', 'instances');
  if (!fs.existsSync(instancesDir)) return [];

  return fs.readdirSync(instancesDir)
    .filter(name => {
      if (!name.startsWith('account')) return false;
      const claudeJson = path.join(instancesDir, name, '.claude.json');
      if (!fs.existsSync(claudeJson)) return false;
      try {
        const data = JSON.parse(fs.readFileSync(claudeJson, 'utf8'));
        return !!data?.oauthAccount?.accountUuid;
      } catch {
        return false;
      }
    })
    .sort();
}

function getAccountEmail(accountId: string): string {
  const claudeJson = path.join(os.homedir(), '.ccs', 'instances', accountId, '.claude.json');
  try {
    const data = JSON.parse(fs.readFileSync(claudeJson, 'utf8'));
    return data?.oauthAccount?.emailAddress || 'unknown';
  } catch {
    return 'unknown';
  }
}

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
  activeSessions: number;
}

const SESSION_PENALTY = 3; // points per active ccs session (reduced to not overwhelm rotation)

/**
 * Count running ccs sessions for an account
 */
function countActiveSessions(accountId: string): number {
  try {
    const output = execSync(
      `pgrep -f "ccs ${accountId}" | wc -l`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }
    );
    return Math.max(0, parseInt(output.trim(), 10) || 0);
  } catch {
    return 0;
  }
}

/**
 * Calculate load-balance score (lower = better candidate)
 */
function calculateScore(usage: AccountWithUsage, lastSelectedId: string | null): number {
  const baseScore = usage.fiveHour.utilization + (usage.activeSessions * SESSION_PENALTY);

  // Add rotation bias: penalize last-used account to force rotation
  const rotationPenalty = usage.id === lastSelectedId ? 50 : 0;

  // Also consider 7-day utilization (but weighted less)
  const longTermWeight = usage.sevenDay.utilization * 0.2;

  // Heavy penalty for accounts at 100% on ANY window (both windows enforce limits)
  const exhaustionPenalty = (usage.fiveHour.utilization >= 100 || usage.sevenDay.utilization >= 100) ? 200 : 0;

  return baseScore + rotationPenalty + longTermWeight + exhaustionPenalty;
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

  return {
    id: accountId,
    email: getAccountEmail(accountId),
    fiveHour: {
      utilization: result.usage.five_hour.utilization,
      resetsAt: result.usage.five_hour.resets_at,
    },
    sevenDay: {
      utilization: result.usage.seven_day.utilization,
      resetsAt: result.usage.seven_day.resets_at,
    },
    credential: serializeCredentials(credentials),
    activeSessions: countActiveSessions(accountId),
  };
}

/**
 * Select optimal account based on load balancing
 */
async function selectAccount(): Promise<void> {
  const usages: AccountWithUsage[] = [];

  // Load selection state
  const state = loadSelectionState();

  // Fetch usage for all accounts in parallel
  const accountIds = discoverAccounts();
  const results = await Promise.all(accountIds.map(getAccountUsage));

  for (const result of results) {
    if (result) {
      usages.push(result);
    }
  }

  if (usages.length === 0) {
    console.log(JSON.stringify({ error: 'Could not fetch usage from any account' }));
    return;
  }

  // Filter out exhausted accounts (100% on BOTH windows)
  // If only one window is at 100%, the account might still be usable in the other window
  const available = usages.filter(u => u.fiveHour.utilization < 100 || u.sevenDay.utilization < 100);

  let selected: AccountWithUsage;
  if (available.length > 0) {
    // Calculate scores with rotation bias
    const scored = available.map(u => ({
      account: u,
      score: calculateScore(u, state.lastSelectedAccount),
    }));

    // Sort by score (lower is better)
    scored.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 5) {
        // Scores very close - use 7-day as tiebreaker
        if (Math.abs(a.account.sevenDay.utilization - b.account.sevenDay.utilization) < 5) {
          // Still close - alphabetical
          return a.account.id < b.account.id ? -1 : 1;
        }
        return a.account.sevenDay.utilization - b.account.sevenDay.utilization;
      }
      return a.score - b.score;
    });

    selected = scored[0].account;
  } else {
    // All exhausted - pick one that resets soonest
    selected = usages.reduce((best, curr) => {
      const bestReset = best.fiveHour.resetsAt ? new Date(best.fiveHour.resetsAt).getTime() : Infinity;
      const currReset = curr.fiveHour.resetsAt ? new Date(curr.fiveHour.resetsAt).getTime() : Infinity;
      return currReset < bestReset ? curr : best;
    });
  }

  // Update selection state
  state.lastSelectedAccount = selected.id;
  state.lastSelectedAt = new Date().toISOString();
  state.selectionHistory.push({
    account: selected.id,
    timestamp: new Date().toISOString(),
    fiveHour: selected.fiveHour.utilization,
    sevenDay: selected.sevenDay.utilization,
  });

  // Keep history bounded
  if (state.selectionHistory.length > HISTORY_SIZE) {
    state.selectionHistory = state.selectionHistory.slice(-HISTORY_SIZE);
  }

  saveSelectionState(state);

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
  const state = loadSelectionState();
  const accountIds = discoverAccounts();
  const results = await Promise.all(accountIds.map(getAccountUsage));

  const accounts = results
    .filter((r): r is AccountWithUsage => r !== null)
    .map(u => ({
      id: u.id,
      email: u.email,
      fiveHour: u.fiveHour,
      sevenDay: u.sevenDay,
      activeSessions: u.activeSessions,
      score: calculateScore(u, state.lastSelectedAccount),
    }))
    .sort((a, b) => a.score - b.score);

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
