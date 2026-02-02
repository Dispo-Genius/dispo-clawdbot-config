import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const prMerge = new Command('pr-merge')
  .description('Merge a pull request')
  .argument('<number>', 'PR number')
  .option('--squash', 'Squash and merge')
  .option('--merge', 'Create a merge commit')
  .option('--rebase', 'Rebase and merge')
  .option('--delete-branch', 'Delete the branch after merging')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: {
    squash?: boolean;
    merge?: boolean;
    rebase?: boolean;
    deleteBranch?: boolean;
    repo?: string;
  }) => {
    try {
      const args: string[] = ['pr', 'merge', number];

      if (options.repo) {
        args.push('--repo', options.repo);
      }

      let method = 'merge';
      if (options.squash) {
        args.push('--squash');
        method = 'squash';
      } else if (options.rebase) {
        args.push('--rebase');
        method = 'rebase';
      } else if (options.merge) {
        args.push('--merge');
        method = 'merge';
      }

      if (options.deleteBranch) {
        args.push('--delete-branch');
      }

      ghRaw(args[0], args.slice(1));

      output(formatMutationResult('Merged PR', {
        number: `#${number}`,
        method,
        deletedBranch: options.deleteBranch || false,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
