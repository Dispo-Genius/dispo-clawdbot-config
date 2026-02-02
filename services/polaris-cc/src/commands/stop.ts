import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const stop = new Command('stop')
  .description('Stop the gateway service')
  .action(() => {
    try {
      const result = clawdbot(['gateway', 'stop'], { timeout: 30000 });
      output(result || 'Gateway stopped');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
