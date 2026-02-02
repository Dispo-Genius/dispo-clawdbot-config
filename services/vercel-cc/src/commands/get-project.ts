import { Command } from 'commander';
import { getProject, formatTimestamp } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatProject, errorOutput } from '../utils/output.js';

export const getProjectCommand = new Command('get-project')
  .description('Get details of a specific Vercel project')
  .argument('<project>', 'Project ID or name')
  .action(async (projectArg) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      // Try to resolve project ID from cache
      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      const project = await getProject(projectId);

      output(formatProject({
        id: project.id,
        name: project.name,
        framework: project.framework,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
