import { Command } from 'commander';
import { git, isGitRepo, getCurrentBranch, GitError } from '../api/git';
import { getStatus } from '../utils/parsers';
import { output, errorOutput, formatSuccess, handleError } from '../utils/output';

export const fetch = new Command('fetch')
  .description('Fetch and rebase from target branch')
  .argument('<branch>', 'Branch to sync from (e.g., origin/main)')
  .action((branch: string) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const currentBranch = getCurrentBranch();

      // Fetch first
      const remote = branch.includes('/') ? branch.split('/')[0] : 'origin';
      try {
        git(['fetch', remote]);
      } catch (error) {
        if (error instanceof GitError) {
          errorOutput(`fetch failed: ${error.summary}`, error.fullOutput);
        }
        errorOutput(`fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Attempt rebase
      try {
        git(['rebase', branch]);
        const status = getStatus();
        if (status.ahead > 0 || status.behind > 0) {
          output(formatSuccess('fetch', `${currentBranch} rebased on ${branch}, ahead:${status.ahead}`));
        } else {
          output(formatSuccess('fetch', `${currentBranch} up-to-date with ${branch}`));
        }
      } catch (error) {
        // Rebase failed, check for conflicts
        const status = getStatus();
        if (status.isRebase && status.conflicts.length > 0) {
          output(`fetch:CONFLICT,${status.rebaseStep}/${status.rebaseTotal},conflicts[${status.conflicts.length}]{${status.conflicts.map(c => c.path).join(',')}}`);
        } else {
          if (error instanceof GitError) {
            errorOutput(`rebase failed: ${error.summary}`, error.fullOutput);
          }
          errorOutput(`rebase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      handleError(error);
    }
  });
