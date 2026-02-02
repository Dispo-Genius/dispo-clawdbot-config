import { Command } from 'commander';
import { linearClient, withRetry, formatApiError } from '../api/client';
import { loadCache } from '../config/cache';
import { output, formatIssueList, errorOutput } from '../utils/output';

export const searchIssues = new Command('search-issues')
  .description('Search issues by text query (title contains, case insensitive)')
  .requiredOption('--query <text>', 'Search text (matches title)')
  .option('--limit <n>', 'Max results', '5')
  .option('--status <status>', 'Optional filter by state')
  .action(async (options: {
    query: string;
    limit?: string;
    status?: string;
  }) => {
    try {
      const cache = loadCache();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first.');
      }

      // Build filter object
      const filter: Record<string, unknown> = {
        team: { id: { eq: cache.team.id } },
        title: { containsIgnoreCase: options.query },
      };

      // Optional status filter
      if (options.status) {
        const statusKey = options.status.toLowerCase().replace(/ /g, '-');
        const stateId = cache.states[statusKey];
        if (!stateId) {
          errorOutput(`Status "${options.status}" not found. Available: ${Object.keys(cache.states).join(', ')}`);
        }
        filter.state = { id: { eq: stateId } };
      }

      const query = `
        query SearchIssues($filter: IssueFilter!, $limit: Int!) {
          issues(filter: $filter, first: $limit, orderBy: updatedAt) {
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
              updatedAt
              url
            }
          }
        }
      `;

      const result = await withRetry(() =>
        linearClient.request<{
          issues: {
            nodes: Array<{
              id: string;
              identifier: string;
              title: string;
              state: { name: string };
              assignee: { name: string } | null;
              updatedAt: string;
              url: string;
            }>;
          };
        }>(query, {
          filter,
          limit: parseInt(options.limit || '5', 10),
        })
      );

      const issues = result.issues.nodes.map(issue => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        state: issue.state.name,
        assignee: issue.assignee?.name || null,
        updatedAt: issue.updatedAt,
      }));

      output(formatIssueList(issues));
    } catch (error) {
      errorOutput(formatApiError(error));
    }
  });
