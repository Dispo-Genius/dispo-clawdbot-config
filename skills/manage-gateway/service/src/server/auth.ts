import type { IncomingMessage } from 'http';
import { validateToken } from '../utils/onepassword';
import { isClientKilled } from '../config/clients';

export interface AuthResult {
  authenticated: boolean;
  client?: ClientContext;
  error?: string;
  statusCode?: number;
}

export interface ClientContext {
  id: string;
  name: string;
  profile: string;
  token: string; // 1Password service account token for fetching secrets
  rateLimit: { rpm: number };
}

// Default rate limit for 1Password-authenticated clients
const DEFAULT_RATE_LIMIT = { rpm: 60 };

/**
 * Validate Bearer token from Authorization header.
 * Token is a 1Password service account token (ops_...).
 * 1Password validates the token - gateway has no token list.
 */
export async function authenticateRequest(req: IncomingMessage): Promise<AuthResult> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Missing Authorization header',
      statusCode: 401,
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Invalid Authorization header format. Expected: Bearer <token>',
      statusCode: 401,
    };
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (!token) {
    return {
      authenticated: false,
      error: 'Empty token',
      statusCode: 401,
    };
  }

  // Validate via 1Password SDK - the token IS the service account token
  const validation = await validateToken(token);

  if (!validation.valid) {
    return {
      authenticated: false,
      error: validation.error ?? 'Invalid token',
      statusCode: 401,
    };
  }

  // Extract client ID from service account name (e.g., "andy-gateway" → "andy")
  // Or use the X-Gateway-Profile header if provided
  const profileHeader = req.headers['x-gateway-profile'];
  const clientId = deriveClientId(validation.serviceAccountName, profileHeader as string | undefined);

  // Check if client is killed (disabled via admin)
  if (isClientKilled(clientId)) {
    return {
      authenticated: false,
      error: `Client "${clientId}" is disabled`,
      statusCode: 503,
    };
  }

  return {
    authenticated: true,
    client: {
      id: clientId,
      name: validation.serviceAccountName ?? clientId,
      profile: clientId, // Profile matches client ID
      token, // Pass token for downstream 1Password lookups
      rateLimit: DEFAULT_RATE_LIMIT,
    },
  };
}

/**
 * Derive client ID from service account name or header.
 * Service account naming convention: {profile}-gateway
 * e.g., "andy-gateway" → "andy", "polaris-gateway" → "polaris"
 */
function deriveClientId(serviceAccountName?: string, profileHeader?: string): string {
  // Header takes precedence if provided
  if (profileHeader) {
    return profileHeader.toLowerCase();
  }

  // Try to extract from service account name
  if (serviceAccountName) {
    // Pattern: sa-{hash}... or {name}-gateway
    const match = serviceAccountName.match(/^(.+)-gateway$/i);
    if (match) {
      return match[1].toLowerCase();
    }
    // If it's a hash-based ID, use as-is
    return serviceAccountName.toLowerCase();
  }

  // Fallback to default
  return 'default';
}
