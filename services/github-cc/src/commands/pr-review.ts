import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const prReview = new Command('pr-review')
  .description('Review a pull request')
  .argument('<number>', 'PR number')
  .option('--approve', 'Approve the PR')
  .option('--comment', 'Add a comment review')
  .option('--request-changes', 'Request changes')
  .option('--body <body>', 'Review body/comment')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: {
    approve?: boolean;
    comment?: boolean;
    requestChanges?: boolean;
    body?: string;
    repo?: string;
  }) => {
    try {
      const args: string[] = ['pr', 'review', number];

      if (options.repo) {
        args.push('--repo', options.repo);
      }

      let action = 'comment';
      if (options.approve) {
        args.push('--approve');
        action = 'approve';
      } else if (options.requestChanges) {
        args.push('--request-changes');
        action = 'request-changes';
      } else if (options.comment) {
        args.push('--comment');
        action = 'comment';
      }

      if (options.body) {
        args.push('--body', options.body);
      }

      ghRaw(args[0], args.slice(1));

      output(formatMutationResult('Reviewed PR', {
        number: `#${number}`,
        action,
        body: options.body ? '(with comment)' : '(no comment)',
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
