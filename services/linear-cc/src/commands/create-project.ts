import { Command } from 'commander';
import { linearClient } from '../api/client';
import { loadCache, isCacheStale, saveCache } from '../config/cache';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const createProject = new Command('create-project')
  .description('Create a new Linear project')
  .argument('<name>', 'Project name')
  .option('--description <description>', 'Project description')
  .action(async (name: string, options: {
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

      // Check if project already exists
      if (cache.projects[name]) {
        errorOutput(`Project "${name}" already exists. ID: ${cache.projects[name]}`);
      }

      // Build mutation variables
      const variables: Record<string, unknown> = {
        teamIds: [cache.team.id],
        name,
      };

      if (options.description) {
        variables.description = options.description;
      }

      const mutation = `
        mutation CreateProject(
          $teamIds: [String!]!,
          $name: String!,
          $description: String
        ) {
          projectCreate(input: {
            teamIds: $teamIds,
            name: $name,
            description: $description
          }) {
            success
            project {
              id
              name
              url
            }
          }
        }
      `;

      const result = await linearClient.request<{
        projectCreate: {
          success: boolean;
          project: { id: string; name: string; url: string };
        };
      }>(mutation, variables);

      if (result.projectCreate.success) {
        // Update cache with new project
        cache.projects[name] = result.projectCreate.project.id;
        saveCache(cache);

        output(formatMutationResult('Created project', {
          id: result.projectCreate.project.id,
          name: result.projectCreate.project.name,
          url: result.projectCreate.project.url,
        }));
      } else {
        errorOutput('Project creation failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
