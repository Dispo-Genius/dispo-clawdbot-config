import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const start = new Command('start')
  .description('Start the gateway service')
  .action(() => {
    try {
      const result = clawdbot(['gateway', 'start'], { timeout: 60000 });
      output(result || 'Gateway started');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
