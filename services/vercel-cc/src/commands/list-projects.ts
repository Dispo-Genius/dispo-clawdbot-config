import { Command } from 'commander';
import { listProjects } from '../api/client.js';
import { loadCache, warnIfStale, listCachedProjects } from '../config/cache.js';
import { output, formatProjectList, errorOutput } from '../utils/output.js';

export const listProjectsCommand = new Command('list-projects')
  .description('List all Vercel projects')
  .option('--cached', 'Use cached data instead of fetching from API')
  .option('--limit <number>', 'Maximum number of projects to return', '100')
  .action(async (options) => {
    try {
      const cache = loadCache();

      if (options.cached) {
        warnIfStale(cache);
        const projects = listCachedProjects(cache);

        const formattedProjects = projects.map((p) => ({
          id: p.id,
          name: p.name,
          framework: p.framework,
        }));

        output(formatProjectList(formattedProjects, 'cache'));
        return;
      }

      const projects = await listProjects(parseInt(options.limit, 10));

      const formattedProjects = projects.map((p) => ({
        id: p.id,
        name: p.name,
        framework: p.framework,
        updatedAt: p.updatedAt,
      }));

      output(formatProjectList(formattedProjects, 'api'));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
