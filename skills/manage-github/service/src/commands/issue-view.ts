import { Command } from 'commander';
import { gh } from '../api/client';
import { output, formatIssue, formatComments, errorOutput } from '../utils/output';
import type { Issue, Comment } from '../types';

interface GhIssueView {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  assignees: Array<{ login: string }>;
  labels: Array<{ name: string }>;
  createdAt: string;
  updatedAt: string;
  url: string;
  body: string;
}

interface GhComment {
  id: string;
  author: { login: string };
  body: string;
  createdAt: string;
}

export const issueView = new Command('issue-view')
  .description('View an issue')
  .argument('<number>', 'Issue number')
  .option('--comments', 'Include comments')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: { comments?: boolean; repo?: string }) => {
    try {
      const result = gh<GhIssueView>(`issue view ${number}`, {
        repo: options.repo,
        json: [
          'number', 'title', 'state', 'author', 'assignees',
          'labels', 'createdAt', 'updatedAt', 'url', 'body'
        ],
      });

      const issue: Issue = {
        number: result.number,
        title: result.title,
        state: result.state.toLowerCase() as 'open' | 'closed',
        author: result.author.login,
        assignees: result.assignees.map((a) => a.login),
        labels: result.labels.map((l) => l.name),
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        url: result.url,
        body: result.body,
      };

      output(formatIssue(issue));

      if (options.comments) {
        const commentsResult = gh<{ comments: GhComment[] }>(`issue view ${number}`, {
          repo: options.repo,
          json: ['comments'],
          args: ['--comments'],
        });

        const rawComments = commentsResult.comments || [];
        const comments: Comment[] = rawComments.map((c) => ({
          id: c.id,
          author: c.author?.login || 'unknown',
          body: c.body,
          createdAt: c.createdAt,
        }));

        if (comments.length > 0) {
          output('\n' + formatComments('issue', issue.number, comments));
        }
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
