import { execFileSync, ExecSyncOptions } from 'child_process';

/**
 * Execute a git command and return the output
 * Uses execFileSync with array args for safety (no shell injection)
 */
export function git(args: string[], options: { throwOnError?: boolean } = {}): string {
  const execOptions: ExecSyncOptions = {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, GIT_EDITOR: 'true' },
  };

  try {
    return (execFileSync('git', args, execOptions) as string).trim();
  } catch (error) {
    if (options.throwOnError !== false) {
      if (error instanceof Error && 'stderr' in error) {
        const stderr = (error as { stderr?: Buffer | string }).stderr;
        const message = stderr
          ? Buffer.isBuffer(stderr) ? stderr.toString() : stderr
          : error.message;
        throw new Error(formatGitError(message));
      }
      throw error;
    }
    return '';
  }
}

/**
 * Execute a git command with a string (for complex args)
 * Splits string into args array
 */
export function gitRaw(command: string, options: { throwOnError?: boolean } = {}): string {
  const args = command.split(/\s+/).filter(Boolean);
  return git(args, options);
}

/**
 * Check if we're in a git repository
 */
export function isGitRepo(): boolean {
  try {
    git(['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
export function getCurrentBranch(): string {
  const branch = git(['branch', '--show-current'], { throwOnError: false });
  if (branch) return branch;
  return git(['rev-parse', '--short', 'HEAD']);
}

/**
 * Get git directory path
 */
export function getGitDir(): string {
  return git(['rev-parse', '--git-dir']);
}

/**
 * Format git errors into user-friendly messages
 */
function formatGitError(message: string): string {
  if (message.includes('not a git repository')) {
    return 'Not in a git repository';
  }
  if (message.includes('does not have any commits')) {
    return 'Repository has no commits yet';
  }
  if (message.includes('CONFLICT')) {
    return 'Merge conflict detected';
  }
  if (message.includes('cannot lock ref')) {
    return 'Branch lock failed - another git process may be running';
  }
  if (message.includes('Authentication failed')) {
    return 'Git authentication failed';
  }

  // Clean up the error message
  return message.replace(/^(fatal|error):\s*/i, '').trim().split('\n')[0];
}
