import { Command } from 'commander';
import { isGitRepo, git } from '../api/git';
import { formatSuccess, output, errorOutput } from '../utils/output';

export const branch = new Command('branch')
  .description('List, create, or switch branches')
  .argument('[name]', 'Branch name (omit to list branches)')
  .option('-b, --create', 'Create new branch')
  .option('-d, --delete', 'Delete branch')
  .option('-D, --force-delete', 'Force delete branch')
  .option('-a, --all', 'List all branches (including remote)')
  .action((name: string | undefined, options: { create?: boolean; delete?: boolean; forceDelete?: boolean; all?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      // List branches
      if (!name) {
        const args = ['branch'];
        if (options.all) args.push('-a');
        const result = git(args, { throwOnError: false });
        if (!result || result.trim() === '') {
          output('branches[0]:none');
        } else {
          const branches = result.trim().split('\n').map(b => {
            const isCurrent = b.startsWith('*');
            const branchName = b.replace(/^\*?\s+/, '').trim();
            return isCurrent ? `*${branchName}` : branchName;
          });
          output(`branches[${branches.length}]:${branches.join('|')}`);
        }
        return;
      }

      // Delete branch
      if (options.delete || options.forceDelete) {
        const flag = options.forceDelete ? '-D' : '-d';
        git(['branch', flag, name]);
        output(formatSuccess('branch', `deleted ${name}`));
        return;
      }

      // Create and switch to new branch
      if (options.create) {
        git(['checkout', '-b', name]);
        output(formatSuccess('branch', `created and switched to ${name}`));
        return;
      }

      // Switch to existing branch
      git(['checkout', name]);
      output(formatSuccess('branch', `switched to ${name}`));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
