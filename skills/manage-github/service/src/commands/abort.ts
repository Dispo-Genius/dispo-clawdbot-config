import { Command } from 'commander';
import { git, isGitRepo } from '../api/git';
import { isInRebase, isInMerge } from '../utils/parsers';
import { output, errorOutput, formatSuccess } from '../utils/output';

export const abort = new Command('abort')
  .description('Abort current rebase or merge operation')
  .action(() => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const rebaseState = isInRebase();
      const mergeState = isInMerge();

      if (rebaseState.inRebase) {
        try {
          git(['rebase', '--abort']);
          output(formatSuccess('abort', 'rebase aborted'));
        } catch (error) {
          errorOutput(`abort failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (mergeState) {
        try {
          git(['merge', '--abort']);
          output(formatSuccess('abort', 'merge aborted'));
        } catch (error) {
          errorOutput(`abort failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        errorOutput('no rebase or merge in progress');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
