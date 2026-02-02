import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { loadCache, isCacheStale } from '../config/cache';
import { existsSync, readFileSync } from 'fs';
import { basename } from 'path';
import { output, formatSuccess, errorOutput } from '../utils/output';

type ExperimentStatus = 'complete' | 'in-progress' | 'failed';

interface ExperimentOptions {
  issue: string;
  name: string;
  hypothesis: string;
  results: string;
  finding: string;
  status: ExperimentStatus;
  json?: string;
  pdf?: string;
}

/**
 * Parse the Experiment Log section from a [CONTEXT] document to find the next experiment number.
 */
function parseNextExperimentNumber(content: string): number {
  // Match "### Experiment #N:" patterns
  const experimentPattern = /### Experiment #(\d+):/g;
  let maxNumber = 0;
  let match: RegExpExecArray | null;

  while ((match = experimentPattern.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > maxNumber) {
      maxNumber = num;
    }
  }

  return maxNumber + 1;
}

/**
 * Format a timestamp for the experiment entry
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Build the experiment log entry markdown
 */
function buildExperimentEntry(
  experimentNumber: number,
  name: string,
  subIssueIdentifier: string,
  status: ExperimentStatus,
  hypothesis: string,
  results: string,
  finding: string,
  attachments: string[]
): string {
  const statusMap: Record<ExperimentStatus, string> = {
    'complete': 'Complete',
    'in-progress': 'In Progress',
    'failed': 'Failed',
  };

  const attachmentLine = attachments.length > 0
    ? `**Attachments:** ${attachments.join(', ')}`
    : '**Attachments:** None';

  return `
### Experiment #${experimentNumber}: ${name} (${formatTimestamp()})
**Sub-issue:** ${subIssueIdentifier}
**Status:** ${statusMap[status]}
**Hypothesis:** ${hypothesis}
**Results:** ${results}
**Finding:** ${finding}
${attachmentLine}
`.trim();
}

/**
 * Append experiment entry to the Experiment Log section of a document
 */
function appendToExperimentLog(content: string, entry: string): string {
  // Look for "## Experiment Log" section
  const sectionPattern = /## Experiment Log\s*/i;
  const match = content.match(sectionPattern);

  if (match && match.index !== undefined) {
    // Find the end of the section header
    const insertIndex = match.index + match[0].length;
    // Insert the new entry after the section header
    return (
      content.slice(0, insertIndex) +
      '\n' + entry + '\n' +
      content.slice(insertIndex)
    );
  }

  // If no Experiment Log section exists, append it at the end
  return content + '\n\n## Experiment Log\n\n' + entry + '\n';
}

export const logExperiment = new Command('log-experiment')
  .description('Log an experiment result to Linear with sub-issue and document update')
  .requiredOption('--issue <id>', 'Parent issue identifier (PRO-123)')
  .requiredOption('--name <name>', 'Experiment name')
  .requiredOption('--hypothesis <hypothesis>', 'What you are testing')
  .requiredOption('--results <results>', 'Key metrics/results summary')
  .requiredOption('--finding <finding>', 'Main takeaway')
  .requiredOption('--status <status>', 'Status: complete, in-progress, or failed')
  .option('--json <path>', 'Path to JSON results file')
  .option('--pdf <path>', 'Path to PDF report file')
  .action(async (options: ExperimentOptions) => {
    try {
      // Validate status
      const validStatuses: ExperimentStatus[] = ['complete', 'in-progress', 'failed'];
      if (!validStatuses.includes(options.status)) {
        console.log(JSON.stringify({
          success: false,
          error: `Invalid status "${options.status}". Must be: ${validStatuses.join(', ')}`,
        }));
        process.exit(1);
      }

      // Validate attachment files exist if provided
      const attachmentFiles: Array<{ path: string; name: string }> = [];
      if (options.json) {
        if (!existsSync(options.json)) {
          console.log(JSON.stringify({
            success: false,
            error: `JSON file not found: ${options.json}`,
          }));
          process.exit(1);
        }
        attachmentFiles.push({ path: options.json, name: basename(options.json) });
      }
      if (options.pdf) {
        if (!existsSync(options.pdf)) {
          console.log(JSON.stringify({
            success: false,
            error: `PDF file not found: ${options.pdf}`,
          }));
          process.exit(1);
        }
        attachmentFiles.push({ path: options.pdf, name: basename(options.pdf) });
      }

      // Load cache for team info
      const cache = loadCache();
      if (!cache) {
        console.log(JSON.stringify({
          success: false,
          error: 'Cache not found. Run `sync` first.',
        }));
        process.exit(1);
      }

      if (isCacheStale(cache)) {
        console.error(JSON.stringify({
          warning: 'Cache is stale. Consider running `sync` to refresh.',
        }));
      }

      const parentIssueUUID = await getIssueUUID(options.issue);

      // Step 1: Fetch [CONTEXT] document for the issue
      const searchQuery = `
        query GetIssueDocuments($id: String!) {
          issue(id: $id) {
            documents {
              nodes {
                id
                title
                content
              }
            }
          }
        }
      `;

      const searchResult = await linearClient.request<{
        issue: {
          documents: { nodes: Array<{ id: string; title: string; content: string }> };
        };
      }>(searchQuery, { id: parentIssueUUID });

      // Find [CONTEXT] document
      const contextDoc = searchResult.issue.documents.nodes.find(doc =>
        doc.title.includes('[CONTEXT]')
      );

      let experimentNumber = 1;
      let contextDocId: string | null = null;
      let contextDocContent = '';

      if (contextDoc) {
        contextDocId = contextDoc.id;
        contextDocContent = contextDoc.content;
        // Step 2: Determine next experiment number
        experimentNumber = parseNextExperimentNumber(contextDocContent);
      }

      // Step 3: Create sub-issue for board visibility
      const subIssueTitle = `[EXP] Experiment #${experimentNumber}: ${options.name}`;
      const subIssueDescription = `**Parent:** ${options.issue}
**Hypothesis:** ${options.hypothesis}
**Status:** ${options.status}

## Results
${options.results}

## Finding
${options.finding}

${attachmentFiles.length > 0 ? `## Attachments\n${attachmentFiles.map(f => `- ${f.name}`).join('\n')}` : ''}`;

      // Get viewer ID for assignment
      const viewerQuery = `query { viewer { id } }`;
      const viewerResult = await linearClient.request<{
        viewer: { id: string };
      }>(viewerQuery);

      const createSubIssueMutation = `
        mutation CreateIssue(
          $teamId: String!,
          $title: String!,
          $description: String,
          $parentId: String,
          $assigneeId: String
        ) {
          issueCreate(input: {
            teamId: $teamId,
            title: $title,
            description: $description,
            parentId: $parentId,
            assigneeId: $assigneeId
          }) {
            success
            issue {
              id
              identifier
              title
              url
            }
          }
        }
      `;

      const subIssueResult = await linearClient.request<{
        issueCreate: {
          success: boolean;
          issue: { id: string; identifier: string; title: string; url: string };
        };
      }>(createSubIssueMutation, {
        teamId: cache.team.id,
        title: subIssueTitle,
        description: subIssueDescription,
        parentId: parentIssueUUID,
        assigneeId: viewerResult.viewer.id,
      });

      if (!subIssueResult.issueCreate.success) {
        console.log(JSON.stringify({
          success: false,
          error: 'Failed to create sub-issue',
        }));
        process.exit(1);
      }

      const subIssue = subIssueResult.issueCreate.issue;

      // Step 4: Upload attachments (skip with warning since endpoint not available)
      const attachmentWarnings: string[] = [];
      if (attachmentFiles.length > 0) {
        attachmentWarnings.push(
          `Attachment upload not yet implemented. Files to manually attach to ${subIssue.identifier}: ${attachmentFiles.map(f => f.name).join(', ')}`
        );
      }

      // Step 5: Update [CONTEXT] document with experiment entry
      let contextDocUpdated = false;
      const attachmentNames = attachmentFiles.map(f => f.name);
      const experimentEntry = buildExperimentEntry(
        experimentNumber,
        options.name,
        subIssue.identifier,
        options.status,
        options.hypothesis,
        options.results,
        options.finding,
        attachmentNames
      );

      if (contextDocId) {
        const updatedContent = appendToExperimentLog(contextDocContent, experimentEntry);

        const updateDocMutation = `
          mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) {
            documentUpdate(id: $id, input: $input) {
              success
            }
          }
        `;

        const updateResult = await linearClient.request<{
          documentUpdate: { success: boolean };
        }>(updateDocMutation, {
          id: contextDocId,
          input: { content: updatedContent },
        });

        contextDocUpdated = updateResult.documentUpdate.success;
      }

      // Step 6: Post comment to parent issue for timeline visibility
      const commentBody = `## 🧪 Experiment #${experimentNumber}: ${options.name}

**Sub-issue:** [${subIssue.identifier}](${subIssue.url})
**Status:** ${options.status}

**Hypothesis:** ${options.hypothesis}

**Results:** ${options.results}

**Finding:** ${options.finding}

${attachmentNames.length > 0 ? `**Attachments:** ${attachmentNames.join(', ')}` : ''}`;

      const createCommentMutation = `
        mutation CreateComment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
            comment {
              id
            }
          }
        }
      `;

      await linearClient.request<{
        commentCreate: { success: boolean; comment: { id: string } | null };
      }>(createCommentMutation, {
        issueId: parentIssueUUID,
        body: commentBody,
      });

      // Return success response
      const response: Record<string, unknown> = {
        success: true,
        experimentNumber,
        subIssue: {
          identifier: subIssue.identifier,
          url: subIssue.url,
        },
        contextDocUpdated,
        attachments: attachmentNames,
      };

      if (attachmentWarnings.length > 0) {
        response.warnings = attachmentWarnings;
      }

      if (!contextDocId) {
        response.warnings = [
          ...(response.warnings as string[] || []),
          `No [CONTEXT] document found on ${options.issue}. Experiment entry was not added to document.`,
        ];
      }

      console.log(JSON.stringify(response));
    } catch (error) {
      console.log(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      process.exit(1);
    }
  });
