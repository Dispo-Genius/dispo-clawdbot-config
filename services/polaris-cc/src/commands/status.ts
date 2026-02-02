import { Command } from 'commander';
import { output, formatStatus, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const status = new Command('status')
  .description('Check gateway health, channel status, and active sessions')
  .option('--deep', 'Probe channels (WhatsApp, Telegram, Discord, Slack, Signal)')
  .option('--usage', 'Include model provider usage/quota snapshots')
  .option('--timeout <ms>', 'Probe timeout in ms', '10000')
  .action((options: {
    deep?: boolean;
    usage?: boolean;
    timeout?: string;
  }) => {
    try {
      const args = ['status', '--json'];

      if (options.deep) args.push('--deep');
      if (options.usage) args.push('--usage');
      if (options.timeout) args.push('--timeout', options.timeout);

      const result = clawdbot(args, { timeout: 30000 });

      try {
        const parsed = JSON.parse(result);
        output(formatStatus(parsed));
      } catch {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
