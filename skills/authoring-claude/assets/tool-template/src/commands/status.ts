import { Command } from 'commander';
import { formatStatus, output, errorOutput } from '../utils/output';

export const status = new Command('status')
  .description('One-line status summary')
  .action(() => {
    try {
      // TODO: Replace with actual status check
      const isConfigured = true;

      if (!isConfigured) {
        errorOutput('not configured');
      }

      // TODO: Replace with actual status
      output(formatStatus({ status: 'ok', message: '' }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
