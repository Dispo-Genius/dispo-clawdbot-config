import { Command } from 'commander';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

export const restart = new Command('restart')
  .description('Restart the gateway service')
  .action(() => {
    try {
      const result = clawdbot(['gateway', 'restart'], { timeout: 60000 });
      output(result || 'Gateway restarted');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
