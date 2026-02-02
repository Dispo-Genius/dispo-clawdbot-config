import { Command } from 'commander';
import { isGitRepo } from '../api/git';
import { getStatus } from '../utils/parsers';
import { formatStatus, output, errorOutput } from '../utils/output';

export const status = new Command('status')
  .description('One-line git status summary')
  .action(() => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const gitStatus = getStatus();
      output(formatStatus(gitStatus));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
