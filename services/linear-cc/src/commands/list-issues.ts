import { Command } from 'commander';
import { linearClient } from '../api/client';
import { loadCache } from '../config/cache';
import { output, formatIssueList, errorOutput } from '../utils/output';

export const listIssues = new Command('list-issues')
  .description('List Linear issues with filters')
  .option('--status <status>', 'Filter by status')
  .option('--label <label>', 'Filter by label')
  .option('--project <project>', 'Filter by project')
  .option('--assignee <assignee>', 'Filter by assignee')
  .option('--limit <limit>', 'Max issues to return', '20')
  .action(async (options: {
    status?: string;
    label?: string;
    project?: string;
    assignee?: string;
    limit?: string;
  }) => {
    try {
      const cache = loadCache();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first.');
      }

      // Build filter object
      const filter: Record<string, unknown> = {
        team: { id: { eq: cache.team.id } },
      };

      // Filter by status
      if (options.status) {
        const statusKey = options.status.toLowerCase().replace(/ /g, '-');
        const stateId = cache.states[statusKey];
        if (!stateId) {
          errorOutput(`Status "${options.status}" not found. Available: ${Object.keys(cache.states).join(', ')}`);
        }
        filter.state = { id: { eq: stateId } };
      }

      // Filter by label
      if (options.label) {
        const labelKey = options.label.toLowerCase();
        const labelId = cache.labels[labelKey];
        if (!labelId) {
          errorOutput(`Label "${options.label}" not found. Available: ${Object.keys(cache.labels).join(', ')}`);
        }
        filter.labels = { some: { id: { eq: labelId } } };
      }

      // Filter by project
      if (options.project) {
        const projectId = cache.projects[options.project];
        if (!projectId) {
          errorOutput(`Project "${options.project}" not found. Available: ${Object.keys(cache.projects).join(', ')}`);
        }
        filter.project = { id: { eq: projectId } };
      }

      // Filter by assignee
      if (options.assignee) {
        const assigneeId = cache.members[options.assignee];
        if (!assigneeId) {
          errorOutput(`Assignee "${options.assignee}" not found. Available: ${Object.keys(cache.members).join(', ')}`);
        }
        filter.assignee = { id: { eq: assigneeId } };
      }

      const query = `
        query ListIssues($filter: IssueFilter!, $limit: Int!) {
          issues(filter: $filter, first: $limit) {
            nodes {
              id
              identifier
              title
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
              url
            }
          }
        }
      `;

      const result = await linearClient.request<{
        issues: {
          nodes: Array<{
            id: string;
            identifier: string;
            title: string;
            state: { name: string };
            assignee: { name: string } | null;
            labels: { nodes: Array<{ name: string }> };
            project: { name: string } | null;
            url: string;
          }>;
        };
      }>(query, {
        filter,
        limit: parseInt(options.limit || '20', 10),
      });

      const issues = result.issues.nodes.map(issue => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        state: issue.state.name,
        assignee: issue.assignee?.name || null,
        labels: issue.labels.nodes.map(l => l.name),
        project: issue.project?.name || null,
        url: issue.url,
      }));

      output(formatIssueList(issues));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
