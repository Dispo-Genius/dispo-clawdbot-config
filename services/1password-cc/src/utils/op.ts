import { execSync, spawnSync } from 'child_process';

const VAULT = 'Polaris';

interface OpResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Check if op CLI is installed
 */
export function checkOpInstalled(): boolean {
  try {
    execSync('op --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute op CLI command with service account auth
 */
export function execOp(args: string[]): OpResult {
  const token = process.env.OP_SERVICE_ACCOUNT_TOKEN;
  if (!token) {
    return { success: false, error: 'OP_SERVICE_ACCOUNT_TOKEN not set' };
  }

  if (!checkOpInstalled()) {
    return {
      success: false,
      error: 'op CLI not installed. Install from https://1password.com/downloads/command-line/'
    };
  }

  const result = spawnSync('op', args, {
    encoding: 'utf-8',
    env: {
      ...process.env,
      OP_SERVICE_ACCOUNT_TOKEN: token,
    },
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || '';

    // Parse common errors
    if (stderr.includes('could not find item')) {
      const match = stderr.match(/could not find item "([^"]+)"/);
      return { success: false, error: `item not found:${match?.[1] ?? 'unknown'}` };
    }
    if (stderr.includes('vault') && stderr.includes('not found')) {
      return { success: false, error: 'Polaris vault not found. Check service account access.' };
    }
    if (stderr.includes('invalid') || stderr.includes('expired') || stderr.includes('unauthorized')) {
      return { success: false, error: 'OP_SERVICE_ACCOUNT_TOKEN invalid or expired' };
    }

    return { success: false, error: stderr || `op exited with code ${result.status}` };
  }

  return { success: true, data: result.stdout?.trim() };
}

/**
 * Get item from vault
 */
export function getItem(name: string): OpResult {
  return execOp(['item', 'get', name, '--vault', VAULT, '--format', 'json']);
}

/**
 * Create or update login item
 */
export function setItem(name: string, username: string, password: string): OpResult {
  // Try to get existing item first
  const existing = getItem(name);

  if (existing.success) {
    // Update existing item
    return execOp([
      'item', 'edit', name,
      '--vault', VAULT,
      `username=${username}`,
      `password=${password}`,
    ]);
  }

  // Create new item
  return execOp([
    'item', 'create',
    '--category', 'login',
    '--vault', VAULT,
    '--title', name,
    `username=${username}`,
    `password=${password}`,
  ]);
}

/**
 * List all items in vault
 */
export function listItems(): OpResult {
  return execOp(['item', 'list', '--vault', VAULT, '--format', 'json']);
}

/**
 * Delete item from vault
 */
export function deleteItem(name: string): OpResult {
  return execOp(['item', 'delete', name, '--vault', VAULT]);
}
