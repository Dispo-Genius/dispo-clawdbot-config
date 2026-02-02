import { Command } from 'commander';
import { linearClient } from '../api/client';
import { output, formatCommentList, errorOutput } from '../utils/output';

export const listComments = new Command('list-comments')
  .description('List comments on a Linear issue')
  .argument('<id>', 'Issue identifier (PRO-426) or UUID')
  .option('--limit <number>', 'Maximum number of comments to return', '50')
  .action(async (id: string, options: { limit: string }) => {
    try {
      const query = `
        query GetIssueComments($id: String!, $first: Int) {
          issue(id: $id) {
            identifier
            title
            comments(first: $first) {
              nodes {
                id
                body
                createdAt
                updatedAt
                user {
                  name
                  email
                }
              }
            }
          }
        }
      `;

      const result = await linearClient.request<{
        issue: {
          identifier: string;
          title: string;
          comments: {
            nodes: Array<{
              id: string;
              body: string;
              createdAt: string;
              updatedAt: string;
              user: { name: string; email: string } | null;
            }>;
          };
        };
      }>(query, { id, first: parseInt(options.limit, 10) });

      const comments = result.issue.comments.nodes.map(c => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: c.user?.name || 'Unknown',
      }));

      output(formatCommentList(result.issue.identifier, comments));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
