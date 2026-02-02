import { execFileSync, ExecSyncOptions } from 'child_process';

export interface GhOptions {
  repo?: string;
  json?: string[];
  limit?: number;
  args?: string[];
}

/**
 * Execute a gh CLI command and return parsed JSON result
 */
export function gh<T>(command: string, options: GhOptions = {}): T {
  // Split command into parts (e.g., "pr view" -> ["pr", "view"])
  const args: string[] = command.split(/\s+/);

  if (options.repo) {
    args.push('--repo', options.repo);
  }

  if (options.json && options.json.length > 0) {
    args.push('--json', options.json.join(','));
  }

  if (options.limit !== undefined) {
    args.push('--limit', String(options.limit));
  }

  if (options.args) {
    args.push(...options.args);
  }

  const execOptions: ExecSyncOptions = {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    // Use execFileSync with array args to properly handle spaces in values
    const result = execFileSync('gh', args, execOptions) as string;
    return JSON.parse(result.trim()) as T;
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const stderr = (error as { stderr?: Buffer | string }).stderr;
      const message = stderr
        ? Buffer.isBuffer(stderr) ? stderr.toString() : stderr
        : error.message;
      throw new Error(formatGhError(message));
    }
    throw error;
  }
}

/**
 * Execute a gh CLI command that returns plain text
 */
export function ghRaw(command: string, args: string[] = []): string {
  // Split command into parts and combine with additional args
  const allArgs = [...command.split(/\s+/), ...args];

  const execOptions: ExecSyncOptions = {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    // Use execFileSync with array args to properly handle spaces in values
    return (execFileSync('gh', allArgs, execOptions) as string).trim();
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const stderr = (error as { stderr?: Buffer | string }).stderr;
      const message = stderr
        ? Buffer.isBuffer(stderr) ? stderr.toString() : stderr
        : error.message;
      throw new Error(formatGhError(message));
    }
    throw error;
  }
}

/**
 * Check if gh CLI is authenticated
 */
export function checkAuth(): boolean {
  try {
    ghRaw('auth', ['status']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current repository info
 */
export function getCurrentRepo(): { owner: string; name: string } | null {
  try {
    const result = gh<{ owner: { login: string }; name: string }>('repo view', {
      json: ['owner', 'name'],
    });
    return { owner: result.owner.login, name: result.name };
  } catch {
    return null;
  }
}

/**
 * Format gh CLI errors into user-friendly messages
 */
function formatGhError(message: string): string {
  if (message.includes('not logged in')) {
    return 'Not authenticated. Run `gh auth login` first';
  }
  if (message.includes('could not determine repo')) {
    return 'Not in a git repository or no remote configured';
  }
  if (message.includes('Could not resolve')) {
    return 'Repository not found or no access';
  }
  if (message.includes('rate limit')) {
    return 'GitHub API rate limit exceeded. Wait and retry';
  }
  if (message.includes('404')) {
    return 'Resource not found';
  }

  // Clean up the error message
  return message.replace(/^error:\s*/i, '').trim().split('\n')[0];
}
