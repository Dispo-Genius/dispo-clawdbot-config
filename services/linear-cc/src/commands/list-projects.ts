import { Command } from 'commander';
import { loadCache, isCacheStale } from '../config/cache';
import { output, formatProjectList, errorOutput } from '../utils/output';

export const listProjects = new Command('list-projects')
  .description('List available Linear projects from cache')
  .action(async () => {
    try {
      const cache = loadCache();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first.');
      }

      if (isCacheStale(cache)) {
        console.error('Warning: Cache is stale. Consider running `sync` to refresh.');
      }

      // Convert projects object to array format
      const projects = Object.entries(cache.projects).map(([name, id]) => ({
        name,
        id,
      }));

      // Sort alphabetically by name
      projects.sort((a, b) => a.name.localeCompare(b.name));

      output(formatProjectList(projects));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
