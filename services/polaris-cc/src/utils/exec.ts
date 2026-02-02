import { execFileSync } from 'child_process';

/**
 * Execute clawdbot with args array (safe from shell injection).
 */
export function clawdbot(
  args: string[],
  options: { timeout?: number } = {}
): string {
  try {
    return execFileSync('clawdbot', args, {
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(err.stderr?.trim() || err.message || 'clawdbot command failed');
  }
}
