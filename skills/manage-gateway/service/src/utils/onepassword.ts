import * as onepassword from '@1password/sdk';

// Cache validated clients by token
const clientCache = new Map<string, onepassword.Client>();

// Default vaults for different secret types
const VAULTS = {
  SHARED: 'Shared Keys',
  OAUTH: 'Claude-OAuth',
} as const;

export interface OnePasswordAuthResult {
  valid: boolean;
  error?: string;
  serviceAccountName?: string;
}

/**
 * Validate a 1Password service account token.
 * Creates a client to verify the token is valid.
 * Returns service account info if valid.
 */
export async function validateToken(token: string): Promise<OnePasswordAuthResult> {
  if (!token.startsWith('ops_')) {
    return { valid: false, error: 'Invalid token format. Expected 1Password service account token (ops_...)' };
  }

  try {
    const client = await getOrCreateClient(token);
    // If we got here, the token is valid
    // Extract service account name from the client (if available)
    return {
      valid: true,
      serviceAccountName: extractServiceAccountName(token),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { valid: false, error: `1Password authentication failed: ${message}` };
  }
}

/**
 * Get or create a 1Password client for a token.
 * Clients are cached for reuse within the same process.
 */
async function getOrCreateClient(token: string): Promise<onepassword.Client> {
  const cached = clientCache.get(token);
  if (cached) {
    return cached;
  }

  const client = await onepassword.createClient({
    auth: token,
    integrationName: 'gateway-cc',
    integrationVersion: '1.0.0',
  });

  clientCache.set(token, client);
  return client;
}

/**
 * Resolve a secret from 1Password.
 * Uses the secret reference format: op://vault/item/field
 *
 * @param token - 1Password service account token
 * @param secretRef - Secret reference (e.g., "op://Shared/LINEAR_API_KEY/credential")
 */
export async function resolveSecret(token: string, secretRef: string): Promise<string | undefined> {
  try {
    const client = await getOrCreateClient(token);
    const secret = await client.secrets.resolve(secretRef);
    return secret;
  } catch (err) {
    console.error(`[1password] Failed to resolve ${secretRef}:`, err instanceof Error ? err.message : err);
    return undefined;
  }
}

/**
 * Get a key from the Shared vault.
 * Convenience wrapper around resolveSecret.
 * Tries multiple field names: credential, password, key (in order).
 *
 * @param token - 1Password service account token
 * @param keyName - Key name (e.g., "LINEAR_API_KEY")
 */
export async function getSharedKey(
  token: string,
  keyName: string
): Promise<string | undefined> {
  // Try common field names in order of preference
  const fieldNames = ['credential', 'password', 'key', 'secret', 'token'];

  for (const field of fieldNames) {
    const value = await resolveSecret(token, `op://${VAULTS.SHARED}/${keyName}/${field}`);
    if (value) {
      return value;
    }
  }

  return undefined;
}

/**
 * Get an OAuth token from the Claude-OAuth vault.
 *
 * @param token - 1Password service account token
 * @param accountName - Account name (e.g., "account1")
 */
export async function getOAuthToken(token: string, accountName: string): Promise<string | undefined> {
  return resolveSecret(token, `op://${VAULTS.OAUTH}/${accountName}/token`);
}

/**
 * List all items in a vault.
 * Returns item titles (key names).
 */
export async function listVaultItems(token: string, vault: string = VAULTS.SHARED): Promise<string[]> {
  try {
    const client = await getOrCreateClient(token);
    // The SDK doesn't have a direct list method, so we'll need to use the items API
    // For now, return empty array - this would need vault ID lookup
    console.warn('[1password] listVaultItems not yet implemented with SDK');
    return [];
  } catch (err) {
    console.error(`[1password] Failed to list vault ${vault}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Extract a readable service account name from the token.
 * This is a best-effort extraction for logging purposes.
 */
function extractServiceAccountName(token: string): string {
  // The token itself doesn't contain the name, but we can derive an identifier
  // For actual name, we'd need to query the 1Password API
  return `sa-${token.slice(4, 12)}...`;
}

/**
 * Clear the client cache (useful for testing or token rotation).
 */
export function clearClientCache(): void {
  clientCache.clear();
}
