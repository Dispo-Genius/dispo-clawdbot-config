import { Command } from 'commander';
import { output, errorOutput, getFormat } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const message = new Command('message')
  .description('Send a message to a target via a channel')
  .argument('<text>', 'Message text to send')
  .requiredOption('--target <target>', 'Target (phone number, username, channel ID)')
  .option('--channel <channel>', 'Channel: whatsapp, telegram, discord, slack', 'whatsapp')
  .option('--media <path>', 'Attach media file')
  .action((text: string, options: { target: string; channel?: string; media?: string }) => {
    try {
      const args = ['message', 'send', '--target', options.target, '--message', text];
      if (options.channel) args.push('--channel', options.channel);
      if (options.media) args.push('--media', options.media);
      args.push('--json');

      const result = clawdbot(args, { timeout: 60000 });

      try {
        const parsed = JSON.parse(result);
        if (getFormat() === 'json') {
          output(JSON.stringify({ success: true, ...parsed }, null, 2));
        } else {
          output(parsed.messageId ? `sent:${parsed.messageId}` : 'Message sent');
        }
      } catch {
        output(result || 'Message sent');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
