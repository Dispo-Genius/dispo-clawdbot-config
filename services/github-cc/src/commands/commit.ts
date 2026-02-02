import { Command } from 'commander';
import { isGitRepo, git, gitRaw } from '../api/git';
import { formatSuccess, output, errorOutput } from '../utils/output';

export const commit = new Command('commit')
  .description('Commit staged changes')
  .requiredOption('-m, --message <message>', 'Commit message')
  .option('--amend', 'Amend the previous commit')
  .action((options: { message: string; amend?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const args = ['commit'];
      if (options.amend) {
        args.push('--amend');
      }
      args.push('-m', options.message);

      git(args);

      // Get the commit hash
      const hash = gitRaw('rev-parse --short HEAD');
      output(formatSuccess('commit', hash));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
