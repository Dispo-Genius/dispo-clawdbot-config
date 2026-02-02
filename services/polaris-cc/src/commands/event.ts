import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const event = new Command('event')
  .description('Enqueue a system event and optionally trigger a heartbeat')
  .argument('<text>', 'Event text content')
  .option('--mode <mode>', 'Timing mode: now, next, or scheduled', 'now')
  .option('--agent <id>', 'Target agent', 'main')
  .option('--heartbeat', 'Trigger heartbeat after event')
  .action((text: string, options: { mode?: string; agent?: string; heartbeat?: boolean }) => {
    try {
      const args = ['system', 'event', '--text', text];
      if (options.mode) args.push('--mode', options.mode);
      if (options.agent) args.push('--agent', options.agent);
      if (options.heartbeat) args.push('--heartbeat');

      const result = clawdbot(args, { timeout: 30000 });
      output(result || 'Event queued');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
