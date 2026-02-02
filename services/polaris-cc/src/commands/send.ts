import { Command } from 'commander';
import { output, formatAgentResponse, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const send = new Command('send')
  .description('Send a text message to Polaris and get a response')
  .argument('<message>', 'Message text to send')
  .option('--agent <id>', 'Target a specific agent (default: main)', 'main')
  .option('--session-id <id>', 'Explicit session id')
  .option('--thinking <level>', 'Thinking level: off, minimal, low, medium, high', 'off')
  .option('--timeout <seconds>', 'Timeout in seconds', '600')
  .action((message: string, options: {
    agent: string;
    sessionId?: string;
    thinking?: string;
    timeout?: string;
  }) => {
    try {
      const args = ['agent', '--message', message, '--json'];

      // Always pass agent (defaults to 'main')
      if (options.sessionId) {
        args.push('--session-id', options.sessionId);
      } else {
        args.push('--agent', options.agent);
      }
      if (options.thinking) args.push('--thinking', options.thinking);
      if (options.timeout) args.push('--timeout', options.timeout);

      const timeoutMs = (parseInt(options.timeout || '600', 10) + 30) * 1000;
      const result = clawdbot(args, { timeout: timeoutMs });

      try {
        const parsed = JSON.parse(result);
        const responseText = parsed.response || parsed.content || parsed.message || result;
        output(formatAgentResponse(responseText));
      } catch {
        output(formatAgentResponse(result));
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
