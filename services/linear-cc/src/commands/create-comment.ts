import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { readFileSync } from 'fs';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const createComment = new Command('create-comment')
  .description('Create a comment on a Linear issue')
  .argument('<id>', 'Issue identifier (DIS-47) or UUID')
  .argument('[body]', 'Comment body text')
  .option('--file <path>', 'Read comment body from file')
  .action(async (id: string, body?: string, options?: { file?: string }) => {
    try {
      // Get body from file or argument
      let commentBody = body;
      if (options?.file) {
        commentBody = readFileSync(options.file, 'utf-8');
      }

      if (!commentBody) {
        errorOutput('Comment body required (argument or --file)');
      }

      // Comments require UUID - resolve identifier if needed
      const uuid = await getIssueUUID(id);

      const mutation = `
        mutation CreateComment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
            comment {
              id
              body
            }
          }
        }
      `;

      const result = await linearClient.request<{
        commentCreate: {
          success: boolean;
          comment: { id: string; body: string } | null;
        };
      }>(mutation, {
        issueId: uuid,
        body: commentBody,
      });

      if (result.commentCreate.success) {
        output(formatMutationResult('Comment added', {
          id: result.commentCreate.comment?.id,
          issueIdentifier: id,
        }));
      } else {
        errorOutput('Comment creation failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
