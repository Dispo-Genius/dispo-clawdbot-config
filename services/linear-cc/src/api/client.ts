import { GraphQLClient, ClientError } from 'graphql-request';

const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.log(JSON.stringify({ success: false, error: 'LINEAR_API_KEY environment variable not set' }));
  process.exit(1);
}

export const linearClient = new GraphQLClient('https://api.linear.app/graphql', {
  headers: {
    Authorization: API_KEY, // No Bearer prefix for Linear
    'Content-Type': 'application/json',
  },
});

/**
 * Format API errors with actionable suggestions.
 */
export function formatApiError(error: unknown): string {
  if (error instanceof ClientError) {
    const status = error.response?.status;

    if (status === 401) {
      return 'Authentication failed. Check LINEAR_API_KEY in .env';
    }
    if (status === 403) {
      return 'Permission denied. Check API key permissions';
    }
    if (status === 404) {
      return 'Resource not found. Run sync to refresh cache';
    }
    if (status === 429) {
      return 'Rate limited. Wait and retry';
    }
    if (status && status >= 500) {
      return `Linear API error (${status}). Retry later`;
    }

    // Extract GraphQL error message if available
    const gqlErrors = error.response?.errors;
    if (gqlErrors && gqlErrors.length > 0) {
      return gqlErrors.map((e: { message: string }) => e.message).join('; ');
    }

    return error.message;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return 'Network error. Check internet connection';
    }
    if (error.message.includes('ETIMEDOUT')) {
      return 'Request timed out. Retry later';
    }
    return error.message;
  }

  return 'Unknown error';
}

/**
 * Retry wrapper with exponential backoff.
 * Skips retry for client errors (4xx except 429).
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry client errors (except rate limits)
      if (error instanceof ClientError) {
        const status = error.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Helper to resolve issue identifier (DIS-47) to UUID
// Comments require UUID, other operations can use either
export async function getIssueUUID(idOrIdentifier: string): Promise<string> {
  // If already a UUID (36 chars with dashes), return as-is
  if (idOrIdentifier.length === 36 && idOrIdentifier.includes('-')) {
    return idOrIdentifier;
  }

  // Otherwise fetch the issue to get its UUID
  const query = `
    query GetIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
      }
    }
  `;

  const result = await linearClient.request<{ issue: { id: string; identifier: string } }>(query, {
    id: idOrIdentifier,
  });

  return result.issue.id;
}
