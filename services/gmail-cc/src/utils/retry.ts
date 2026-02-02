export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'socket hang up',
    'network',
    'timeout',
    '429', // Rate limit
    '500',
    '502',
    '503',
    '504',
  ],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof Error) {
    const errorStr = `${error.message} ${(error as NodeJS.ErrnoException).code || ''}`.toLowerCase();
    return retryableErrors.some((re) => errorStr.includes(re.toLowerCase()));
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      console.error(
        `Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms...`
      );
      await sleep(delay);
      delay *= opts.backoffMultiplier;
    }
  }

  throw lastError;
}
