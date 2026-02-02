import { Command } from 'commander';
import { linearClient } from '../api/client';
import { loadCache, isCacheStale } from '../config/cache';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const createIssue = new Command('create-issue')
  .description('Create a new Linear issue')
  .argument('<title>', 'Issue title')
  .option('--label <label>', 'Label name (e.g., feature, bug)')
  .option('--project <project>', 'Project name')
  .option('--assignee <assignee>', 'Assignee name')
  .option('--unassigned', 'Leave issue unassigned (default: assign to current user)')
  .option('--description <description>', 'Issue description')
  .option('--priority <priority>', 'Priority (1=urgent, 2=high, 3=medium, 4=low)', '3')
  .action(async (title: string, options: {
    label?: string;
    project?: string;
    assignee?: string;
    unassigned?: boolean;
    description?: string;
    priority?: string;
  }) => {
    try {
      const cache = loadCache();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first.');
      }

      if (isCacheStale(cache)) {
        console.error('Warning: Cache is stale. Consider running `sync` to refresh.');
      }

      // Build mutation variables
      const variables: Record<string, unknown> = {
        teamId: cache.team.id,
        title,
        priority: parseInt(options.priority || '3', 10),
      };

      if (options.description) {
        variables.description = options.description;
      }

      // Resolve label ID
      if (options.label) {
        const labelKey = options.label.toLowerCase();
        const labelId = cache.labels[labelKey];
        if (!labelId) {
          errorOutput(`Label "${options.label}" not found. Available: ${Object.keys(cache.labels).join(', ')}`);
        }
        variables.labelIds = [labelId];
      }

      // Resolve project ID
      if (options.project) {
        const projectId = cache.projects[options.project];
        if (!projectId) {
          errorOutput(`Project "${options.project}" not found. Available: ${Object.keys(cache.projects).join(', ')}`);
        }
        variables.projectId = projectId;
      }

      // Resolve assignee ID
      // Default: auto-assign to current user (viewer) unless explicitly unassigned
      if (options.unassigned) {
        // Explicitly unassigned - don't set assigneeId
      } else if (options.assignee) {
        // Explicitly assigned to someone
        const assigneeId = cache.members[options.assignee];
        if (!assigneeId) {
          errorOutput(`Assignee "${options.assignee}" not found. Available: ${Object.keys(cache.members).join(', ')}`);
        }
        variables.assigneeId = assigneeId;
      } else {
        // Default: auto-assign to current user
        const viewerQuery = `query { viewer { id } }`;
        const viewerResult = await linearClient.request<{
          viewer: { id: string };
        }>(viewerQuery);
        variables.assigneeId = viewerResult.viewer.id;
      }

      const mutation = `
        mutation CreateIssue(
          $teamId: String!,
          $title: String!,
          $description: String,
          $priority: Int,
          $labelIds: [String!],
          $projectId: String,
          $assigneeId: String
        ) {
          issueCreate(input: {
            teamId: $teamId,
            title: $title,
            description: $description,
            priority: $priority,
            labelIds: $labelIds,
            projectId: $projectId,
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

      const result = await linearClient.request<{
        issueCreate: {
          success: boolean;
          issue: { id: string; identifier: string; title: string; url: string };
        };
      }>(mutation, variables);

      if (result.issueCreate.success) {
        output(formatMutationResult('Created', {
          identifier: result.issueCreate.issue.identifier,
          id: result.issueCreate.issue.id,
          title: result.issueCreate.issue.title,
          url: result.issueCreate.issue.url,
        }));
      } else {
        errorOutput('Issue creation failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
