import { Command } from 'commander';
import { isGitRepo, git } from '../api/git';
import { formatSuccess, formatWorktreeList, output, errorOutput } from '../utils/output';

export const worktree = new Command('worktree')
  .description('Manage git worktrees')
  .argument('[action]', 'Action: list (default), add, remove, prune', 'list')
  .argument('[path]', 'Worktree path (for add/remove)')
  .option('-b, --branch <name>', 'Branch name for new worktree')
  .option('--force', 'Force removal')
  .action((action: string, path: string | undefined, options: { branch?: string; force?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      switch (action) {
        case 'list': {
          const result = git(['worktree', 'list', '--porcelain'], { throwOnError: false });
          output(formatWorktreeList(result || ''));
          break;
        }
        case 'add': {
          if (!path) {
            errorOutput('path required for add');
          }
          const args = ['worktree', 'add', path];
          if (options.branch) {
            args.push('-b', options.branch);
          }
          git(args);
          output(formatSuccess('worktree', `created ${path}`));
          break;
        }
        case 'remove': {
          if (!path) {
            errorOutput('path required for remove');
          }
          const args = ['worktree', 'remove', path];
          if (options.force) {
            args.push('--force');
          }
          git(args);
          output(formatSuccess('worktree', `removed ${path}`));
          break;
        }
        case 'prune': {
          git(['worktree', 'prune']);
          output(formatSuccess('worktree', 'pruned stale entries'));
          break;
        }
        default:
          errorOutput(`unknown worktree action: ${action}`);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
