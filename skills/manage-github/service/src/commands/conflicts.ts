import { Command } from 'commander';
import { isGitRepo } from '../api/git';
import { getConflicts } from '../utils/parsers';
import { formatConflicts, output, errorOutput } from '../utils/output';

export const conflicts = new Command('conflicts')
  .description('List conflicted files with line numbers')
  .action(() => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const conflictFiles = getConflicts();
      output(formatConflicts(conflictFiles));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
