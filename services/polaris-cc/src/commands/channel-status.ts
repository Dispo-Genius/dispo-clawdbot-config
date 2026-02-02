import { Command } from 'commander';
import { output, formatStatus, errorOutput, getFormat } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const channelStatus = new Command('channel-status')
  .description('Show gateway channel status')
  .option('--deep', 'Probe each channel for detailed status')
  .action((options: { deep?: boolean }) => {
    try {
      const args = ['channels', 'status', '--json'];
      if (options.deep) args.push('--deep');

      const result = clawdbot(args, { timeout: 60000 });

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
