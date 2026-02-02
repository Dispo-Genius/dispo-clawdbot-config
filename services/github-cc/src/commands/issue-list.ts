import { Command } from 'commander';
import { gh } from '../api/client';
import { output, formatIssueList, errorOutput } from '../utils/output';
import type { IssueList } from '../types';

interface GhIssueListItem {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  labels: Array<{ name: string }>;
  updatedAt: string;
}

export const issueList = new Command('issue-list')
  .description('List issues')
  .option('--state <state>', 'Filter by state: open, closed, all', 'open')
  .option('--assignee <assignee>', 'Filter by assignee')
  .option('--label <label>', 'Filter by label')
  .option('--limit <limit>', 'Max issues to return', '20')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (options: {
    state?: string;
    assignee?: string;
    label?: string;
    limit?: string;
    repo?: string;
  }) => {
    try {
      const args: string[] = [];

      if (options.state) {
        args.push('--state', options.state);
      }
      if (options.assignee) {
        args.push('--assignee', options.assignee);
      }
      if (options.label) {
        args.push('--label', options.label);
      }

      const result = gh<GhIssueListItem[]>('issue list', {
        repo: options.repo,
        json: ['number', 'title', 'state', 'author', 'labels', 'updatedAt'],
        limit: parseInt(options.limit || '20', 10),
        args,
      });

      const issues: IssueList[] = result.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(),
        author: issue.author.login,
        labels: issue.labels.map((l) => l.name),
        updatedAt: issue.updatedAt,
      }));

      output(formatIssueList(issues));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
