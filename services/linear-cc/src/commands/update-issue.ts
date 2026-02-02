import { Command } from 'commander';
import { linearClient, getIssueUUID } from '../api/client';
import { loadCache, isCacheStale } from '../config/cache';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const updateIssue = new Command('update-issue')
  .description('Update a Linear issue')
  .argument('<id>', 'Issue identifier (e.g., DIS-47)')
  .option('--project <project>', 'Project name')
  .option('--milestone <milestone>', 'Milestone name (format: "Project:Milestone")')
  .option('--assignee <assignee>', 'Assignee name')
  .option('--priority <priority>', 'Priority (1=urgent, 2=high, 3=medium, 4=low)')
  .option('--due <date>', 'Due date (YYYY-MM-DD format)')
  .option('--description <text>', 'Issue description (markdown)')
  .action(async (id: string, options: {
    project?: string;
    milestone?: string;
    assignee?: string;
    priority?: string;
    due?: string;
    description?: string;
  }) => {
    try {
      const cache = loadCache();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first.');
      }

      if (isCacheStale(cache)) {
        console.error('Warning: Cache is stale. Consider running `sync` to refresh.');
      }

      // Get issue UUID
      const issueId = await getIssueUUID(id);

      // Build update input
      const input: Record<string, unknown> = {};

      // Resolve project ID
      if (options.project) {
        const projectId = cache.projects[options.project];
        if (!projectId) {
          errorOutput(`Project "${options.project}" not found. Available: ${Object.keys(cache.projects).join(', ')}`);
        }
        input.projectId = projectId;
      }

      // Resolve milestone ID (format: "Project:Milestone")
      // Also sets projectId since Linear requires both
      if (options.milestone) {
        const parts = options.milestone.split(':');
        if (parts.length !== 2) {
          errorOutput(`Milestone must be in format "Project:Milestone". Got: "${options.milestone}"`);
        }
        const [projectName, milestoneName] = parts;
        const projectMilestones = cache.milestones?.[projectName];
        if (!projectMilestones) {
          errorOutput(`Project "${projectName}" not found or has no milestones. Available projects with milestones: ${Object.keys(cache.milestones || {}).join(', ')}`);
        }
        const milestoneId = projectMilestones[milestoneName];
        if (!milestoneId) {
          errorOutput(`Milestone "${milestoneName}" not found in project "${projectName}". Available: ${Object.keys(projectMilestones).join(', ')}`);
        }
        // Linear requires projectId when setting projectMilestoneId
        const projectId = cache.projects[projectName];
        if (!projectId) {
          errorOutput(`Project "${projectName}" not found in cache. Run sync first.`);
        }
        input.projectId = projectId;
        input.projectMilestoneId = milestoneId;
      }

      // Resolve assignee ID
      if (options.assignee) {
        const assigneeId = cache.members[options.assignee];
        if (!assigneeId) {
          errorOutput(`Assignee "${options.assignee}" not found. Available: ${Object.keys(cache.members).join(', ')}`);
        }
        input.assigneeId = assigneeId;
      }

      if (options.priority) {
        input.priority = parseInt(options.priority, 10);
      }

      if (options.due) {
        input.dueDate = options.due;
      }

      if (options.description) {
        input.description = options.description;
      }

      if (Object.keys(input).length === 0) {
        errorOutput('No update options provided. Use --project, --milestone, --assignee, --priority, --due, or --description.');
      }

      const mutation = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              title
              url
              project {
                name
              }
              assignee {
                name
              }
            }
          }
        }
      `;

      const result = await linearClient.request<{
        issueUpdate: {
          success: boolean;
          issue: {
            id: string;
            identifier: string;
            title: string;
            url: string;
            project: { name: string } | null;
            assignee: { name: string } | null;
          };
        };
      }>(mutation, { id: issueId, input });

      if (result.issueUpdate.success) {
        output(formatMutationResult('Updated', {
          identifier: result.issueUpdate.issue.identifier,
          id: result.issueUpdate.issue.id,
          title: result.issueUpdate.issue.title,
          url: result.issueUpdate.issue.url,
          project: result.issueUpdate.issue.project?.name || null,
          assignee: result.issueUpdate.issue.assignee?.name || null,
        }));
      } else {
        errorOutput('Issue update failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
