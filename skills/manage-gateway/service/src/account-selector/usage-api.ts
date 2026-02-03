/**
 * Fetch real usage data from Anthropic's OAuth usage API
 *
 * Endpoint: GET https://api.anthropic.com/api/oauth/usage
 * Requires: Authorization: Bearer {accessToken}
 *           anthropic-beta: oauth-2025-04-20
 */

import * as https from 'https';
import { getSharedKey } from '../utils/onepassword';

export interface UsageWindow {
  utilization: number;
  resets_at: string | null;
}

export interface OAuthUsageResponse {
  five_hour: UsageWindow;
  seven_day: UsageWindow;
  seven_day_oauth_apps: UsageWindow | null;
  seven_day_opus: UsageWindow | null;
  seven_day_sonnet: UsageWindow | null;
  seven_day_cowork: UsageWindow | null;
  extra_usage: {
    is_enabled: boolean;
    monthly_limit: number | null;
    used_credits: number | null;
    utilization: number | null;
  };
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string;
  rateLimitTier: string;
}

export interface AccountWithUsage {
  id: string;
  fiveHour: {
    utilization: number;
    resetsAt: string | null;
  };
  sevenDay: {
    utilization: number;
    resetsAt: string | null;
  };
  subscriptionType: string;
  rateLimitTier: string;
  accessToken: string;
}

/**
 * Parse OAuth credentials from 1Password
 * Handles both:
 * - Full JSON: {"claudeAiOauth":{"accessToken":"sk-ant-...",...}}
 * - Just the access token: "sk-ant-oat01-..."
 */
export function parseOAuthCredentials(value: string): OAuthCredentials | null {
  // If it starts with sk-ant-, it's just the access token
  if (value.startsWith('sk-ant-')) {
    return {
      accessToken: value,
      refreshToken: '',
      expiresAt: 0,
      scopes: [],
      subscriptionType: 'unknown',
      rateLimitTier: 'unknown',
    };
  }

  // Otherwise try to parse as JSON
  try {
    const data = JSON.parse(value);
    const oauth = data.claudeAiOauth;
    if (!oauth?.accessToken) {
      console.error('[usage-api] Invalid OAuth credentials: missing accessToken');
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
  } catch (err) {
    console.error('[usage-api] Failed to parse OAuth credentials:', err);
    return null;
  }
}

/**
 * Fetch usage from Anthropic API
 */
export async function fetchUsage(accessToken: string): Promise<OAuthUsageResponse | null> {
  return new Promise((resolve) => {
    const options: https.RequestOptions = {
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`[usage-api] API returned ${res.statusCode}: ${data}`);
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(data) as OAuthUsageResponse);
        } catch {
          console.error('[usage-api] Failed to parse response:', data);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[usage-api] Request failed:', err.message);
      resolve(null);
    });

    req.setTimeout(10000, () => {
      console.error('[usage-api] Request timeout');
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Get OAuth credentials from 1Password
 * Looks for CLAUDE_OAUTH_{ACCOUNT_ID} in Shared Keys vault
 */
export async function getOAuthFromOnePassword(
  serviceAccountToken: string,
  accountId: string
): Promise<OAuthCredentials | null> {
  const keyName = `CLAUDE_OAUTH_${accountId.toUpperCase()}`;
  const json = await getSharedKey(serviceAccountToken, keyName);

  if (!json) {
    console.error(`[usage-api] No credentials found for ${keyName} in 1Password`);
    return null;
  }

  return parseOAuthCredentials(json);
}

/**
 * Fetch real usage for an account from 1Password + Anthropic API
 */
export async function getAccountUsageFromAPI(
  serviceAccountToken: string,
  accountId: string
): Promise<AccountWithUsage | null> {
  // Get OAuth credentials from 1Password
  const credentials = await getOAuthFromOnePassword(serviceAccountToken, accountId);
  if (!credentials) {
    return null;
  }

  // Fetch usage from API
  const usage = await fetchUsage(credentials.accessToken);
  if (!usage) {
    return null;
  }

  return {
    id: accountId,
    fiveHour: {
      utilization: usage.five_hour.utilization,
      resetsAt: usage.five_hour.resets_at,
    },
    sevenDay: {
      utilization: usage.seven_day.utilization,
      resetsAt: usage.seven_day.resets_at,
    },
    subscriptionType: credentials.subscriptionType,
    rateLimitTier: credentials.rateLimitTier,
    accessToken: credentials.accessToken,
  };
}

/**
 * Fetch usage for all known accounts
 */
export async function getAllAccountsUsageFromAPI(
  serviceAccountToken: string,
  accountIds: string[]
): Promise<AccountWithUsage[]> {
  const results = await Promise.all(
    accountIds.map((id) => getAccountUsageFromAPI(serviceAccountToken, id))
  );
  return results.filter((r): r is AccountWithUsage => r !== null);
}

/**
 * Token provided by client for a specific account
 */
export interface ClientProvidedToken {
  accountId: string;
  credential: string; // Full JSON blob: {"claudeAiOauth":{...}}
}

/**
 * Fetch usage for accounts using client-provided tokens
 * This bypasses 1Password lookup - the client provides their local keychain tokens
 */
export async function getUsageFromClientTokens(
  tokens: ClientProvidedToken[]
): Promise<AccountWithUsage[]> {
  const results = await Promise.all(
    tokens.map(async ({ accountId, credential }) => {
      const creds = parseOAuthCredentials(credential);
      if (!creds) {
        console.error(`[usage-api] Invalid credentials for ${accountId}`);
        return null;
      }

      const usage = await fetchUsage(creds.accessToken);
      if (!usage) {
        console.error(`[usage-api] Failed to fetch usage for ${accountId}`);
        return null;
      }

      return {
        id: accountId,
        fiveHour: {
          utilization: usage.five_hour.utilization,
          resetsAt: usage.five_hour.resets_at,
        },
        sevenDay: {
          utilization: usage.seven_day.utilization,
          resetsAt: usage.seven_day.resets_at,
        },
        subscriptionType: creds.subscriptionType,
        rateLimitTier: creds.rateLimitTier,
        accessToken: creds.accessToken,
      };
    })
  );
  return results.filter((r): r is AccountWithUsage => r !== null);
}
