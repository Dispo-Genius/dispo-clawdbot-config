import { Command } from 'commander';
import { output, formatStatus, errorOutput, getFormat } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const updateStatus = new Command('update-status')
  .description('Show update channel and version status')
  .action(() => {
    try {
      const result = clawdbot(['update', 'status', '--json'], { timeout: 30000 });

      try {
        const parsed = JSON.parse(result);
        if (getFormat() === 'json') {
          output(JSON.stringify({ success: true, ...parsed }, null, 2));
        } else {
          output(formatStatus(parsed));
        }
      } catch {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
