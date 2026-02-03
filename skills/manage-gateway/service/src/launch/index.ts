/**
 * Gateway Launch - Claude Code session launcher
 *
 * Flow:
 * 1. Query gateway HTTP server for optimal account + credentials
 * 2. Gateway handles: 1Password access, live usage fetching, account selection
 * 3. Client injects credentials to local macOS keychain
 * 4. Client execs claude
 */

import { execSync, spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import * as http from 'http';
import * as https from 'https';
import { getKey } from '../utils/keychain';

// Gateway URL - can be overridden via env
// Note: Gateway runs on HTTP (not HTTPS) by default
const DEFAULT_GATEWAY_URL = 'http://polariss-mac-mini-1.tail3351a2.ts.net:4100';

export interface LaunchOptions {
  /** Override account selection */
  account?: string;
  /** Project path (default: cwd) */
  project?: string;
  /** Skip --dangerously-skip-permissions (default: false, i.e. include the flag) */
  skipPermissions?: boolean;
  /** Additional args for claude */
  passthroughArgs?: string[];
  /** Dry run - don't actually launch */
  dryRun?: boolean;
  /** Gateway URL override */
  gatewayUrl?: string;
}

export interface LaunchResult {
  success: boolean;
  account: string;
  error?: string;
  exitCode?: number;
}

interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string;
  rateLimitTier: string;
}

interface GatewaySelectResponse {
  account: string;
  fiveHour: { utilization: number; resetsAt: string | null };
  sevenDay: { utilization: number; resetsAt: string | null };
  credential: string; // Full OAuth JSON blob
  error?: string;
}

/** Account metadata for OAuth accounts */
const ACCOUNT_METADATA: Record<string, object> = {
  account1: {
    accountUuid: '5c78bf4e-db99-4ecb-b43a-269d52239d65',
    emailAddress: 'andyrongdg@gmail.com',
    organizationUuid: 'c8c72f82-7385-45a0-8f93-33643e1e96b2',
    hasExtraUsageEnabled: false,
    displayName: 'Andres',
    organizationRole: 'admin',
    workspaceRole: null,
    organizationName: "andyrongdg@gmail.com's Organization",
  },
  account2: {
    accountUuid: '15c77e3e-409c-47cd-8a9e-82b166326b6d',
    emailAddress: 'andy@dispogenius.io',
    organizationUuid: 'b1522e1f-051f-4bf5-a04b-c25fd4774c86',
    hasExtraUsageEnabled: true,
    displayName: 'Andy',
    organizationRole: 'admin',
    workspaceRole: null,
    organizationName: "andy@dispogenius.io's Organization",
  },
  account3: {
    accountUuid: 'f67edf22-536b-4186-a142-d05bab277f5c',
    emailAddress: 'polaris@support.dispogenius.io',
    organizationUuid: '4bd7b443-4a83-4003-8423-78c884cd7a12',
    hasExtraUsageEnabled: false,
    displayName: 'Polaris',
    organizationRole: 'admin',
    workspaceRole: null,
    organizationName: "polaris@support.dispogenius.io's Organization",
  },
};

/**
 * Compute keychain service name for Claude Code credentials
 */
function computeKeychainService(configDir: string): string {
  const hash = createHash('sha256').update(configDir).digest('hex').slice(0, 8);
  return `Claude Code-credentials-${hash}`;
}

/**
 * Read OAuth credentials from local keychain for all accounts
 */
function readLocalCredentials(): Array<{ accountId: string; credential: string }> {
  const results: Array<{ accountId: string; credential: string }> = [];
  const accountIds = ['account1', 'account2', 'account3'];

  for (const accountId of accountIds) {
    const configDir = join(homedir(), '.ccs/instances', accountId);
    const keychainService = computeKeychainService(configDir);
    const username = process.env.USER || 'andyrong';

    try {
      const credential = execSync(
        `security find-generic-password -s "${keychainService}" -a "${username}" -w 2>/dev/null`,
        { encoding: 'utf-8' }
      ).trim();
      if (credential) {
        results.push({ accountId, credential });
      }
    } catch {
      // Account not found in keychain, skip
    }
  }

  return results;
}

/**
 * Query gateway for account selection using client-provided tokens
 * Client reads tokens from local keychain, gateway fetches usage and selects optimal account
 */
async function queryGateway(
  gatewayUrl: string,
  gatewayToken: string,
  accountOverride?: string
): Promise<GatewaySelectResponse | { error: string }> {
  // Read credentials from local keychain
  const localTokens = readLocalCredentials();

  if (localTokens.length === 0) {
    return { error: 'No OAuth credentials found in local keychain. Run `claude` first to authenticate each account.' };
  }

  const requestBody = JSON.stringify({
    tokens: localTokens,
    account: accountOverride,
  });

  return new Promise((resolve) => {
    const url = new URL('/account-selector/select-with-tokens', gatewayUrl);
    const isHttps = url.protocol === 'https:';
    const requestLib = isHttps ? https : http;

    const req = requestLib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 4100),
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
        timeout: 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve({ error: `Gateway returned ${res.statusCode}: ${data}` });
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ error: `Invalid JSON from gateway: ${data}` });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ error: `Gateway connection failed: ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'Gateway request timeout' });
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Parse credential JSON blob from gateway
 */
function parseCredentials(credentialBlob: string): OAuthCredentials | null {
  try {
    const data = JSON.parse(credentialBlob);
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
 * Inject OAuth credentials to macOS keychain
 */
function injectToKeychain(serviceName: string, credentials: OAuthCredentials): void {
  const credentialJson = JSON.stringify({
    claudeAiOauth: {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt: credentials.expiresAt,
      scopes: credentials.scopes,
      subscriptionType: credentials.subscriptionType,
      rateLimitTier: credentials.rateLimitTier,
    },
  });

  const username = process.env.USER || 'andyrong';

  // Delete existing if present (ignore errors)
  try {
    execSync(`security delete-generic-password -s "${serviceName}" -a "${username}" 2>/dev/null`, {
      encoding: 'utf-8',
    });
  } catch {
    // Ignore - key may not exist
  }

  // Add to keychain using -U flag to update if exists
  try {
    execSync(
      `security add-generic-password -U -s "${serviceName}" -a "${username}" -w '${credentialJson.replace(/'/g, "'\"'\"'")}'`,
      { encoding: 'utf-8' }
    );
  } catch (err) {
    throw new Error(`Failed to inject credentials to keychain: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Ensure CCS instance directory exists with proper symlinks
 */
function ensureInstanceDir(accountId: string): string {
  const instanceDir = join(homedir(), '.ccs/instances', accountId);
  const claudeDir = join(homedir(), '.claude');
  const sharedDir = join(homedir(), '.ccs/shared');

  if (!existsSync(instanceDir)) {
    mkdirSync(instanceDir, { recursive: true });
  }

  // Create symlinks to shared config
  const symlinks: Array<{ name: string; target: string }> = [
    { name: 'CLAUDE.md', target: join(claudeDir, 'CLAUDE.md') },
    { name: 'coordination', target: join(claudeDir, 'coordination') },
    { name: 'hooks', target: join(claudeDir, 'hooks') },
    { name: 'manifest.yaml', target: join(claudeDir, 'manifest.yaml') },
    { name: 'scripts', target: join(claudeDir, 'scripts') },
    { name: 'services', target: join(claudeDir, 'services') },
    { name: 'skill-rules.json', target: join(claudeDir, 'skill-rules.json') },
    { name: 'statusline.sh', target: join(claudeDir, 'statusline.sh') },
    { name: 'tools', target: join(claudeDir, 'tools') },
    { name: 'agents', target: join(sharedDir, 'agents') },
    { name: 'commands', target: join(sharedDir, 'commands') },
    { name: 'plugins', target: join(sharedDir, 'plugins') },
    { name: 'settings.json', target: join(sharedDir, 'settings.json') },
    { name: 'skills', target: join(sharedDir, 'skills') },
  ];

  for (const { name, target } of symlinks) {
    const linkPath = join(instanceDir, name);
    if (!existsSync(linkPath) && existsSync(target)) {
      try {
        execSync(`ln -sf "${target}" "${linkPath}"`, { encoding: 'utf-8' });
      } catch {
        // Ignore symlink errors
      }
    }
  }

  // Create .claude.json with oauthAccount metadata if missing
  const claudeJsonPath = join(instanceDir, '.claude.json');
  if (!existsSync(claudeJsonPath) || !hasOAuthMetadata(claudeJsonPath)) {
    const metadata = ACCOUNT_METADATA[accountId] || {};
    writeFileSync(
      claudeJsonPath,
      JSON.stringify(
        {
          oauthAccount: metadata,
          hasCompletedOnboarding: true,
          numStartups: 0,
        },
        null,
        2
      )
    );
  }

  return instanceDir;
}

function hasOAuthMetadata(claudeJsonPath: string): boolean {
  try {
    const content = JSON.parse(readFileSync(claudeJsonPath, 'utf-8'));
    return !!content?.oauthAccount?.accountUuid;
  } catch {
    return false;
  }
}

/**
 * Format usage display like cc.sh did
 */
function formatUsageDisplay(response: GatewaySelectResponse): string {
  const fiveHour = Math.round(response.fiveHour.utilization);
  const sevenDay = Math.round(response.sevenDay.utilization);

  let resetsIn = '-';
  if (response.fiveHour.resetsAt) {
    const resetTime = new Date(response.fiveHour.resetsAt).getTime();
    const now = Date.now();
    const diffMins = Math.floor((resetTime - now) / 60000);
    if (diffMins > 0) {
      resetsIn = diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins / 60)}h`;
    }
  }

  return `5h:\x1b[36m${fiveHour}%\x1b[0m  7d:\x1b[36m${sevenDay}%\x1b[0m  resets \x1b[33m${resetsIn}\x1b[0m`;
}

/**
 * Launch Claude Code with optimal account selection via gateway
 */
export async function launchClaude(opts: LaunchOptions = {}): Promise<LaunchResult> {
  // 1. Get OP service account token (used for both 1Password access AND gateway auth)
  const opToken = process.env.OP_SERVICE_ACCOUNT_TOKEN || getKey('OP_SERVICE_ACCOUNT_TOKEN');
  if (!opToken) {
    return {
      success: false,
      account: '',
      error: 'OP_SERVICE_ACCOUNT_TOKEN not set. Set via environment or keychain.',
    };
  }
  const gatewayToken = opToken;

  const gatewayUrl = opts.gatewayUrl || process.env.GATEWAY_URL || DEFAULT_GATEWAY_URL;

  // 2. Query gateway for account selection + credentials
  const response = await queryGateway(gatewayUrl, gatewayToken, opts.account);

  if ('error' in response && !('account' in response)) {
    return {
      success: false,
      account: opts.account || '',
      error: `Gateway error: ${response.error}`,
    };
  }

  const gatewayResponse = response as GatewaySelectResponse;

  if (gatewayResponse.error) {
    return {
      success: false,
      account: gatewayResponse.account || '',
      error: gatewayResponse.error,
    };
  }

  const accountId = gatewayResponse.account;

  // 3. Parse credentials from gateway response
  const credentials = parseCredentials(gatewayResponse.credential);
  if (!credentials) {
    return {
      success: false,
      account: accountId,
      error: 'Invalid credentials received from gateway',
    };
  }

  // 4. Ensure instance directory exists
  const configDir = ensureInstanceDir(accountId);

  // 5. Inject credentials to keychain
  const keychainService = computeKeychainService(configDir);
  try {
    injectToKeychain(keychainService, credentials);
  } catch (err) {
    return {
      success: false,
      account: accountId,
      error: `Keychain injection failed: ${err instanceof Error ? err.message : err}`,
    };
  }

  // 6. Print status with usage info
  const usageDisplay = formatUsageDisplay(gatewayResponse);
  console.error(`  \x1b[32m●\x1b[0m \x1b[1m${accountId}\x1b[0m  ${usageDisplay}`);

  // 7. Dry run - just show what would happen
  if (opts.dryRun) {
    console.log(`Would launch claude with:`);
    console.log(`  Account: ${accountId}`);
    console.log(`  Config:  ${configDir}`);
    console.log(`  Keychain: ${keychainService}`);
    return { success: true, account: accountId, exitCode: 0 };
  }

  // 8. Build claude args
  const claudeArgs: string[] = [];

  if (opts.skipPermissions !== true) {
    claudeArgs.push('--dangerously-skip-permissions');
  }

  if (opts.passthroughArgs && opts.passthroughArgs.length > 0) {
    claudeArgs.push(...opts.passthroughArgs);
  }

  // 9. Set CLAUDE_CONFIG_DIR and exec claude
  process.env.CLAUDE_CONFIG_DIR = configDir;

  const result = spawnSync('claude', claudeArgs, {
    stdio: 'inherit',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });

  return {
    success: result.status === 0,
    account: accountId,
    exitCode: result.status ?? 1,
  };
}
