import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, formatMutationResult, handleError } from '../utils/output';

export const prCreate = new Command('pr-create')
  .description('Create a pull request')
  .option('--title <title>', 'PR title')
  .option('--body <body>', 'PR body')
  .option('--base <base>', 'Base branch (default: repo default branch)')
  .option('--head <head>', 'Head branch (default: current branch)')
  .option('--draft', 'Create as draft PR')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (options: {
    title?: string;
    body?: string;
    base?: string;
    head?: string;
    draft?: boolean;
    repo?: string;
  }) => {
    try {
      const args: string[] = ['pr', 'create'];

      if (options.repo) {
        args.push('--repo', options.repo);
      }
      if (options.title) {
        args.push('--title', options.title);
      }
      if (options.body) {
        args.push('--body', options.body);
      }
      if (options.base) {
        args.push('--base', options.base);
      }
      if (options.head) {
        args.push('--head', options.head);
      }
      if (options.draft) {
        args.push('--draft');
      }

      const result = ghRaw(args[0], args.slice(1));

      // gh pr create returns the PR URL on success
      const prUrl = result.trim();
      const prNumber = prUrl.match(/\/pull\/(\d+)/)?.[1] || 'unknown';

      output(formatMutationResult('Created PR', {
        number: `#${prNumber}`,
        url: prUrl,
        title: options.title || '(from branch)',
        draft: options.draft || false,
      }));
    } catch (error) {
      handleError(error);
    }
  });
