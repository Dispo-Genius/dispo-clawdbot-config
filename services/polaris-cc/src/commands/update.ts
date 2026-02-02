import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const update = new Command('update')
  .description('Update Clawdbot to the latest version')
  .option('--channel <channel>', 'Update channel: stable, beta, dev')
  .option('--no-restart', 'Skip restarting the gateway service after update')
  .option('--yes', 'Skip confirmation prompts (non-interactive)')
  .action((options: { channel?: string; restart?: boolean; yes?: boolean }) => {
    try {
      const args = ['update'];
      if (options.channel) args.push('--channel', options.channel);
      if (options.restart === false) args.push('--no-restart');
      if (options.yes) args.push('--yes');

      // Updates can take a while
      const result = clawdbot(args, { timeout: 600000 });
      output(result || 'Update complete');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
