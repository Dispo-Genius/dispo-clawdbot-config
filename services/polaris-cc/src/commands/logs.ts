import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const logs = new Command('logs')
  .description('Tail gateway logs')
  .option('--limit <n>', 'Max lines to return', '50')
  .option('--plain', 'Plain text output (no ANSI styling)')
  .action((options: { limit?: string; plain?: boolean }) => {
    try {
      const args = ['logs'];
      if (options.limit) args.push('--limit', options.limit);
      if (options.plain) args.push('--plain');

      const result = clawdbot(args, { timeout: 30000 });
      output(result);
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
