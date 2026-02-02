import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { output, formatDocumentList, errorOutput } from '../utils/output';

export const listDocuments = new Command('list-documents')
  .description('List documents attached to a Linear issue')
  .requiredOption('--issue <id>', 'Issue identifier (PRO-123) or UUID')
  .option('--title <pattern>', 'Filter by title pattern (supports wildcards like "[CONTEXT]*")')
  .action(async (options: { issue: string; title?: string }) => {
    try {
      // Resolve issue identifier to UUID
      const issueUUID = await getIssueUUID(options.issue);

      const query = `
        query GetIssueDocuments($id: String!) {
          issue(id: $id) {
            id
            identifier
            attachments(filter: { sourceType: { eq: "document" } }) {
              nodes {
                id
                title
                url
                createdAt
                updatedAt
              }
            }
            documents {
              nodes {
                id
                title
                url
                createdAt
                updatedAt
              }
            }
          }
        }
      `;

      interface DocumentNode {
        id: string;
        title: string;
        url: string;
        createdAt: string;
        updatedAt: string;
      }

      const result = await linearClient.request<{
        issue: {
          id: string;
          identifier: string;
          attachments: { nodes: DocumentNode[] };
          documents: { nodes: DocumentNode[] };
        };
      }>(query, { id: issueUUID });

      // Combine documents from both sources (attachments and direct documents)
      let documents = [
        ...result.issue.documents.nodes,
      ];

      // Remove duplicates by id
      documents = documents.filter((doc, index, self) =>
        index === self.findIndex(d => d.id === doc.id)
      );

      // Filter by title pattern if provided
      if (options.title) {
        const pattern = options.title
          .replace(/\*/g, '.*')  // Convert * to regex .*
          .replace(/\[/g, '\\[') // Escape brackets
          .replace(/\]/g, '\\]');
        const regex = new RegExp(pattern, 'i');
        documents = documents.filter(doc => regex.test(doc.title));
      }

      // Sort by updatedAt descending (most recent first)
      documents.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const formattedDocs = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      output(formatDocumentList(formattedDocs));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
