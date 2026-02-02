import { Command } from 'commander';
import { output, formatMessageList, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const read = new Command('read')
  .description('Read recent messages from a session')
  .option('--session-id <id>', 'Session id to read from')
  .option('--limit <n>', 'Max messages to return', '20')
  .option('--channel <channel>', 'Filter by channel (whatsapp, telegram, discord, etc.)')
  .action((options: {
    sessionId?: string;
    limit?: string;
    channel?: string;
  }) => {
    try {
      const args = ['message', 'read', '--json'];

      if (options.sessionId) args.push('--session-id', options.sessionId);
      if (options.limit) args.push('--limit', options.limit);
      if (options.channel) args.push('--channel', options.channel);

      const result = clawdbot(args);

      try {
        const parsed = JSON.parse(result);
        const messages = Array.isArray(parsed) ? parsed : (parsed.messages || []);
        output(formatMessageList(messages));
      } catch {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
