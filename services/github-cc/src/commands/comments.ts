import { Command } from 'commander';
import { gh } from '../api/client';
import { output, formatComments, errorOutput } from '../utils/output';
import type { Comment } from '../types';

interface GhComment {
  id: string;
  author: { login: string };
  body: string;
  createdAt: string;
  url?: string;
}

export const comments = new Command('comments')
  .description('View comments on a PR or issue')
  .argument('<type>', 'Type: pr or issue')
  .argument('<number>', 'PR or issue number')
  .option('--limit <limit>', 'Max comments to return', '50')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (type: string, number: string, options: { limit?: string; repo?: string }) => {
    try {
      if (type !== 'pr' && type !== 'issue') {
        errorOutput('Type must be "pr" or "issue"');
      }

      const command = type === 'pr' ? 'pr view' : 'issue view';

      const result = gh<{ comments: GhComment[] }>(`${command} ${number}`, {
        repo: options.repo,
        json: ['comments'],
        args: ['--comments'],
      });

      const rawComments = result.comments || [];
      const limit = parseInt(options.limit || '50', 10);
      const limitedComments = rawComments.slice(0, limit);

      const formattedComments: Comment[] = limitedComments.map((c) => ({
        id: c.id,
        author: c.author?.login || 'unknown',
        body: c.body,
        createdAt: c.createdAt,
        url: c.url,
      }));

      output(formatComments(type as 'pr' | 'issue', parseInt(number, 10), formattedComments));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
