import type { IncomingMessage } from 'http';
import { getClientByToken, isClientKilled, type ClientContext } from '../config/clients';

export interface AuthResult {
  authenticated: boolean;
  client?: ClientContext;
  error?: string;
  statusCode?: number;
}

/**
 * Validate Bearer token from Authorization header.
 * Returns client context if valid, error details if not.
 */
export function authenticateRequest(req: IncomingMessage): AuthResult {
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

  const client = getClientByToken(token);

  if (!client) {
    return {
      authenticated: false,
      error: 'Invalid token',
      statusCode: 401,
    };
  }

  // Check if client is killed
  if (isClientKilled(client.id)) {
    return {
      authenticated: false,
      error: `Client "${client.name}" is disabled`,
      statusCode: 503,
    };
  }

  return {
    authenticated: true,
    client: {
      id: client.id,
      name: client.name,
      profile: client.profile,
      rateLimit: client.rateLimit,
    },
  };
}
