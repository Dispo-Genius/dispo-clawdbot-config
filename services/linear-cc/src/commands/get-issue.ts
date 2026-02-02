import { Command } from 'commander';
import { linearClient } from '../api/client';
import { output, formatIssue, errorOutput } from '../utils/output';

export const getIssue = new Command('get-issue')
  .description('Get details of a Linear issue')
  .argument('<id>', 'Issue identifier (DIS-47) or UUID')
  .action(async (id: string) => {
    try {
      const query = `
        query GetIssue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            url
            state {
              name
            }
            assignee {
              name
            }
            labels {
              nodes {
                name
              }
            }
            project {
              name
            }
            priority
            createdAt
            updatedAt
          }
        }
      `;

      const result = await linearClient.request<{
        issue: {
          id: string;
          identifier: string;
          title: string;
          description: string | null;
          url: string;
          state: { name: string };
          assignee: { name: string } | null;
          labels: { nodes: Array<{ name: string }> };
          project: { name: string } | null;
          priority: number;
          createdAt: string;
          updatedAt: string;
        };
      }>(query, { id });

      output(formatIssue({
        id: result.issue.id,
        identifier: result.issue.identifier,
        title: result.issue.title,
        description: result.issue.description,
        url: result.issue.url,
        state: result.issue.state.name,
        assignee: result.issue.assignee?.name || null,
        labels: result.issue.labels.nodes.map(l => l.name),
        project: result.issue.project?.name || null,
        priority: result.issue.priority,
        createdAt: result.issue.createdAt,
        updatedAt: result.issue.updatedAt,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
