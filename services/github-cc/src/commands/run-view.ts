import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, errorOutput } from '../utils/output';

export const runView = new Command('run-view')
  .description('View workflow run details and failed job logs')
  .argument('<run-id>', 'Workflow run ID')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action((runId: string, options: { repo?: string }) => {
    try {
      const args: string[] = [];
      if (options.repo) {
        args.push('--repo', options.repo);
      }

      // Get run details
      const details = ghRaw('run view', [runId, ...args]);

      // Try to get failed logs if run has failures
      let failedLogs = '';
      try {
        failedLogs = ghRaw('run view', [runId, '--log-failed', ...args]);
      } catch {
        // No failed logs available (run succeeded or still in progress)
      }

      let result = details;
      if (failedLogs) {
        result += '\n\n--- FAILED JOB LOGS ---\n' + failedLogs;
      }

      // Truncate if very long
      const lines = result.split('\n');
      if (lines.length > 200) {
        output(lines.slice(0, 200).join('\n') + `\n... truncated (${lines.length - 200} more lines)`);
      } else {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
