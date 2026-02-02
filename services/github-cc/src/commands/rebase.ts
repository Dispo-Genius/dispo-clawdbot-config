import { Command } from 'commander';
import { git, isGitRepo } from '../api/git';
import { getStatus } from '../utils/parsers';
import { formatRebaseResult, output, errorOutput } from '../utils/output';
import type { RebaseResult } from '../types';

export const rebase = new Command('rebase')
  .description('Rebase with conflict summary')
  .argument('<branch>', 'Branch to rebase onto')
  .option('--continue', 'Continue rebase after resolving conflicts')
  .action((branch: string, options: { continue?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      let result: RebaseResult;

      if (options.continue) {
        // Continue rebase
        try {
          git(['rebase', '--continue']);
          result = { success: true };
        } catch (error) {
          const status = getStatus();
          if (status.isRebase && status.conflicts.length > 0) {
            result = {
              success: false,
              step: status.rebaseStep,
              total: status.rebaseTotal,
              conflicts: status.conflicts.map(c => c.path),
            };
          } else {
            errorOutput(`rebase --continue failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        // Start new rebase
        try {
          git(['rebase', branch]);
          result = { success: true };
        } catch (error) {
          const status = getStatus();
          if (status.isRebase && status.conflicts.length > 0) {
            result = {
              success: false,
              step: status.rebaseStep,
              total: status.rebaseTotal,
              conflicts: status.conflicts.map(c => c.path),
            };
          } else {
            errorOutput(`rebase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      output(formatRebaseResult(result!));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
