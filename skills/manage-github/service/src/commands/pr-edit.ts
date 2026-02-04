import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, formatMutationResult, handleError } from '../utils/output';

export const prEdit = new Command('pr-edit')
  .description('Edit a pull request')
  .argument('<number>', 'PR number')
  .option('--title <title>', 'New PR title')
  .option('--body <body>', 'New PR body')
  .option('--add-label <labels...>', 'Labels to add')
  .option('--remove-label <labels...>', 'Labels to remove')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: {
    title?: string;
    body?: string;
    addLabel?: string[];
    removeLabel?: string[];
    repo?: string;
  }) => {
    try {
      const args: string[] = ['pr', 'edit', number];

      if (options.repo) {
        args.push('--repo', options.repo);
      }
      if (options.title) {
        args.push('--title', options.title);
      }
      if (options.body) {
        args.push('--body', options.body);
      }
      if (options.addLabel) {
        for (const label of options.addLabel) {
          args.push('--add-label', label);
        }
      }
      if (options.removeLabel) {
        for (const label of options.removeLabel) {
          args.push('--remove-label', label);
        }
      }

      ghRaw(args[0], args.slice(1));

      output(formatMutationResult('Edited PR', {
        number: `#${number}`,
        title: options.title ? `→ ${options.title}` : '(unchanged)',
        labelsAdded: options.addLabel?.join(', ') || '(none)',
        labelsRemoved: options.removeLabel?.join(', ') || '(none)',
      }));
    } catch (error) {
      handleError(error);
    }
  });
