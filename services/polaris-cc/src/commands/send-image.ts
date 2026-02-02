import { Command } from 'commander';
import { existsSync } from 'fs';
import { output, formatAgentResponse, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const sendImage = new Command('send-image')
  .description('Send an image (with optional text) to Polaris')
  .argument('<image-path>', 'Path to the image file')
  .option('-m, --message <text>', 'Optional text message to accompany the image')
  .option('--agent <id>', 'Target a specific agent')
  .option('--session-id <id>', 'Explicit session id')
  .option('--timeout <seconds>', 'Timeout in seconds', '600')
  .action((imagePath: string, options: {
    message?: string;
    agent?: string;
    sessionId?: string;
    timeout?: string;
  }) => {
    try {
      if (!existsSync(imagePath)) {
        errorOutput(`Image file not found: ${imagePath}`);
      }

      const args = ['agent', '--json'];
      args.push('--message', options.message || 'Please analyze this image.');
      args.push('--media', imagePath);

      if (options.agent) args.push('--agent', options.agent);
      if (options.sessionId) args.push('--session-id', options.sessionId);
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
