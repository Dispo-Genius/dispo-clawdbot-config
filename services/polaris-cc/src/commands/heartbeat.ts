import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const heartbeat = new Command('heartbeat')
  .description('Trigger a heartbeat check')
  .option('--agent <id>', 'Target agent', 'main')
  .action((options: { agent?: string }) => {
    try {
      const args = ['system', 'heartbeat'];
      if (options.agent) args.push('--agent', options.agent);

      const result = clawdbot(args, { timeout: 60000 });
      output(result || 'Heartbeat triggered');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
