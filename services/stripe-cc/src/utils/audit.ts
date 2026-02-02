import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const LOG_DIR = path.join(homedir(), '.claude', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'stripe-cc.log');

/**
 * Log a confirmed operation to the audit log.
 */
export function auditLog(
  command: string,
  args: Record<string, unknown>,
  result: 'success' | 'error',
  details?: string
): void {
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    command,
    args,
    result,
    details,
    liveMode: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_'),
  };

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(LOG_FILE, line, 'utf-8');
}
