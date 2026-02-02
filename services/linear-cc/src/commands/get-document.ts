import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { output, formatDocument, errorOutput } from '../utils/output';

export const getDocument = new Command('get-document')
  .description('Get a document by ID or by searching issue documents by title pattern')
  .option('--id <documentId>', 'Document UUID')
  .option('--issue <id>', 'Issue identifier (PRO-123) to search in')
  .option('--title <pattern>', 'Title pattern to match (e.g., "[CONTEXT]*")')
  .action(async (options: { id?: string; issue?: string; title?: string }) => {
    try {
      // Must provide either --id or both --issue and --title
      if (!options.id && (!options.issue || !options.title)) {
        errorOutput('Must provide either --id or both --issue and --title');
      }

      let documentId = options.id;

      // If searching by issue and title, find the document first
      if (!documentId && options.issue && options.title) {
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
        const pattern = options.title
          .replace(/\*/g, '.*')
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]');
        const regex = new RegExp(pattern, 'i');

        const matchingDoc = searchResult.issue.documents.nodes.find(doc =>
          regex.test(doc.title)
        );

        if (!matchingDoc) {
          errorOutput(`No document found matching title pattern "${options.title}" on issue ${options.issue}. Available: ${searchResult.issue.documents.nodes.map(d => d.title).join(', ')}`);
        }

        documentId = matchingDoc.id;
      }

      // Fetch the full document
      const query = `
        query GetDocument($id: String!) {
          document(id: $id) {
            id
            title
            content
            url
            createdAt
            updatedAt
            creator {
              name
            }
            issue {
              id
              identifier
            }
            project {
              id
              name
            }
          }
        }
      `;

      const result = await linearClient.request<{
        document: {
          id: string;
          title: string;
          content: string;
          url: string;
          createdAt: string;
          updatedAt: string;
          creator: { name: string } | null;
          issue: { id: string; identifier: string } | null;
          project: { id: string; name: string } | null;
        };
      }>(query, { id: documentId });

      output(formatDocument({
        id: result.document.id,
        title: result.document.title,
        content: result.document.content,
        url: result.document.url,
        createdAt: result.document.createdAt,
        updatedAt: result.document.updatedAt,
        creator: result.document.creator?.name ?? null,
        issue: result.document.issue ? {
          id: result.document.issue.id,
          identifier: result.document.issue.identifier,
        } : null,
        project: result.document.project ? {
          id: result.document.project.id,
          name: result.document.project.name,
        } : null,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
