import { Command } from 'commander';
import { output, formatSessionList, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const sessions = new Command('sessions')
  .description('List conversation sessions')
  .option('--active <minutes>', 'Filter to sessions updated within N minutes')
  .action((options: {
    active?: string;
  }) => {
    try {
      const args = ['sessions', '--json'];

      if (options.active) args.push('--active', options.active);

      const result = clawdbot(args);

      try {
        const parsed = JSON.parse(result);
        const sessionList = Array.isArray(parsed) ? parsed : (parsed.sessions || []);
        output(formatSessionList(sessionList));
      } catch {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
