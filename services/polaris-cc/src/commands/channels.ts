import { Command } from 'commander';
import { output, errorOutput, getFormat } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const channels = new Command('channels')
  .description('List configured channels and auth profiles')
  .action(() => {
    try {
      const result = clawdbot(['channels', 'list', '--json'], { timeout: 30000 });

      try {
        const parsed = JSON.parse(result);
        if (getFormat() === 'json') {
          output(JSON.stringify({ success: true, ...parsed }, null, 2));
        } else {
          // Format as compact list: chat channels + auth providers
          const lines: string[] = [];

          // Chat channels
          if (parsed.chat) {
            for (const [channel, accounts] of Object.entries(parsed.chat)) {
              const accts = Array.isArray(accounts) ? accounts.join(',') : String(accounts);
              lines.push(`${channel}:${accts}`);
            }
          }

          // Auth profiles
          if (parsed.auth?.length) {
            lines.push('---');
            for (const auth of parsed.auth) {
              lines.push(`auth:${auth.id}:${auth.type}`);
            }
          }

          output(lines.join('\n') || 'No channels configured');
        }
      } catch {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
