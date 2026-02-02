import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { readFileSync } from 'fs';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const updateDocument = new Command('update-document')
  .description('Update an existing Linear document')
  .option('--id <documentId>', 'Document UUID to update')
  .option('--issue <id>', 'Issue identifier (PRO-123) to find document in')
  .option('--title-pattern <pattern>', 'Title pattern to find document (e.g., "[CONTEXT]*")')
  .option('--title <newTitle>', 'New title for the document')
  .option('--content <content>', 'New content for the document (markdown)')
  .option('--file <path>', 'Read new content from file')
  .action(async (options: {
    id?: string;
    issue?: string;
    titlePattern?: string;
    title?: string;
    content?: string;
    file?: string;
  }) => {
    try {
      // Must provide --id or (--issue + --title-pattern)
      if (!options.id && (!options.issue || !options.titlePattern)) {
        errorOutput('Must provide either --id or both --issue and --title-pattern');
      }

      // Must provide something to update
      if (!options.title && !options.content && !options.file) {
        errorOutput('Must provide --title, --content, or --file to update');
      }

      let documentId = options.id;

      // If searching by issue and title pattern, find the document first
      if (!documentId && options.issue && options.titlePattern) {
        const issueUUID = await getIssueUUID(options.issue);

        const searchQuery = `
          query GetIssueDocuments($id: String!) {
            issue(id: $id) {
              documents {
                nodes {
                  id
                  title
                }
              }
            }
          }
        `;

        const searchResult = await linearClient.request<{
          issue: {
            documents: { nodes: Array<{ id: string; title: string }> };
          };
        }>(searchQuery, { id: issueUUID });

        // Convert title pattern to regex
        const pattern = options.titlePattern
          .replace(/\*/g, '.*')
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]');
        const regex = new RegExp(pattern, 'i');

        const matchingDoc = searchResult.issue.documents.nodes.find(doc =>
          regex.test(doc.title)
        );

        if (!matchingDoc) {
          errorOutput(`No document found matching title pattern "${options.titlePattern}" on issue ${options.issue}. Available: ${searchResult.issue.documents.nodes.map(d => d.title).join(', ')}`);
        }

        documentId = matchingDoc.id;
      }

      // Build update input
      const input: Record<string, string> = {};

      if (options.title) {
        input.title = options.title;
      }

      // Get content from file or argument
      if (options.file) {
        input.content = readFileSync(options.file, 'utf-8');
      } else if (options.content) {
        input.content = options.content;
      }

      const mutation = `
        mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) {
          documentUpdate(id: $id, input: $input) {
            success
            document {
              id
              title
              url
              updatedAt
            }
          }
        }
      `;

      const result = await linearClient.request<{
        documentUpdate: {
          success: boolean;
          document: {
            id: string;
            title: string;
            url: string;
            updatedAt: string;
          } | null;
        };
      }>(mutation, { id: documentId, input });

      if (result.documentUpdate.success && result.documentUpdate.document) {
        output(formatMutationResult('Updated document', {
          id: result.documentUpdate.document.id,
          title: result.documentUpdate.document.title,
          url: result.documentUpdate.document.url,
        }));
      } else {
        errorOutput('Document update failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
