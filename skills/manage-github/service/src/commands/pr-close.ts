import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const prClose = new Command('pr-close')
  .description('Close a pull request')
  .argument('<number>', 'PR number')
  .option('--delete-branch', 'Delete the branch after closing')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: {
    deleteBranch?: boolean;
    repo?: string;
  }) => {
    try {
      const args: string[] = ['pr', 'close', number];

      if (options.repo) {
        args.push('--repo', options.repo);
      }

      if (options.deleteBranch) {
        args.push('--delete-branch');
      }

      ghRaw(args[0], args.slice(1));

      output(formatMutationResult('Closed PR', {
        number: `#${number}`,
        deletedBranch: options.deleteBranch || false,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
