import { Command } from 'commander';
import { output, errorOutput, getFormat } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const broadcast = new Command('broadcast')
  .description('Broadcast a message to multiple targets')
  .argument('<text>', 'Message text to broadcast')
  .requiredOption('--targets <targets>', 'Comma-separated list of targets')
  .option('--channel <channel>', 'Channel: whatsapp, telegram, discord, slack', 'whatsapp')
  .action((text: string, options: { targets: string; channel?: string }) => {
    try {
      const targets = options.targets.split(',').map(t => t.trim());
      const args = ['message', 'broadcast', '--message', text];

      // Add each target
      for (const target of targets) {
        args.push('--target', target);
      }

      if (options.channel) args.push('--channel', options.channel);
      args.push('--json');

      const result = clawdbot(args, { timeout: 120000 });

      try {
        const parsed = JSON.parse(result);
        if (getFormat() === 'json') {
          output(JSON.stringify({ success: true, ...parsed }, null, 2));
        } else {
          const sent = parsed.sent || parsed.results?.length || targets.length;
          output(`broadcast:${sent} messages sent`);
        }
      } catch {
        output(result || 'Broadcast sent');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
