import { Command } from 'commander';
import { git, isGitRepo, GitError } from '../api/git';
import { getStatus } from '../utils/parsers';
import { formatRebaseResult, output, errorOutput, handleError } from '../utils/output';
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
            if (error instanceof GitError) {
              errorOutput(`rebase --continue failed: ${error.summary}`, error.fullOutput);
            }
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
            if (error instanceof GitError) {
              errorOutput(`rebase failed: ${error.summary}`, error.fullOutput);
            }
            errorOutput(`rebase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      output(formatRebaseResult(result!));
    } catch (error) {
      handleError(error);
    }
  });
