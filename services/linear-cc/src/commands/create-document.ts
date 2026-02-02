import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { readFileSync } from 'fs';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const createDocument = new Command('create-document')
  .description('Create a document in Linear, optionally attached to an issue or project')
  .argument('<title>', 'Document title')
  .argument('[content]', 'Document content (markdown)')
  .option('--file <path>', 'Read content from file')
  .option('--issue <id>', 'Attach to issue (identifier like PRO-123 or UUID)')
  .option('--project <id>', 'Attach to project (UUID)')
  .action(async (title: string, content?: string, options?: { file?: string; issue?: string; project?: string }) => {
    try {
      // Get content from file or argument
      let documentContent = content;
      if (options?.file) {
        documentContent = readFileSync(options.file, 'utf-8');
      }

      // Build input object
      const input: Record<string, string> = { title };

      if (documentContent) {
        input.content = documentContent;
      }

      // Resolve issue identifier to UUID if provided
      if (options?.issue) {
        input.issueId = await getIssueUUID(options.issue);
      }

      if (options?.project) {
        input.projectId = options.project;
      }

      const mutation = `
        mutation CreateDocument($input: DocumentCreateInput!) {
          documentCreate(input: $input) {
            success
            document {
              id
              title
              url
            }
          }
        }
      `;

      const result = await linearClient.request<{
        documentCreate: {
          success: boolean;
          document: { id: string; title: string; url: string } | null;
        };
      }>(mutation, { input });

      if (result.documentCreate.success && result.documentCreate.document) {
        output(formatMutationResult('Created document', {
          id: result.documentCreate.document.id,
          title: result.documentCreate.document.title,
          url: result.documentCreate.document.url,
        }));
      } else {
        errorOutput('Document creation failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
