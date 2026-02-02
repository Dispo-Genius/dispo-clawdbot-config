import { Command } from 'commander';
import { isGitRepo, git, getCurrentBranch } from '../api/git';
import { formatSuccess, output, errorOutput } from '../utils/output';

export const push = new Command('push')
  .description('Push commits to remote')
  .option('-u, --set-upstream', 'Set upstream tracking')
  .option('-f, --force', 'Force push (use with caution)')
  .option('--force-with-lease', 'Force push with lease (safer)')
  .argument('[remote]', 'Remote name', 'origin')
  .argument('[branch]', 'Branch name (defaults to current)')
  .action((remote: string, branch: string | undefined, options: { setUpstream?: boolean; force?: boolean; forceWithLease?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const currentBranch = branch || getCurrentBranch();
      const args = ['push'];

      if (options.setUpstream) {
        args.push('-u');
      }
      if (options.force) {
        args.push('--force');
      }
      if (options.forceWithLease) {
        args.push('--force-with-lease');
      }

      args.push(remote, currentBranch);

      git(args);
      output(formatSuccess('push', `${remote}/${currentBranch}`));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
