import { Command } from 'commander';
import {
  listDeployments,
  formatDeploymentState,
  formatTimestamp,
} from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatDeploymentList, errorOutput } from '../utils/output.js';

export const listDeploymentsCommand = new Command('list-deployments')
  .description('List deployments for a project')
  .argument('[project]', 'Project ID or name (optional, lists all if omitted)')
  .option('--limit <number>', 'Maximum number of deployments to return', '20')
  .action(async (projectArg, options) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      let projectId: string | undefined;
      if (projectArg) {
        projectId = resolveProjectId(cache, projectArg) || projectArg;
      }

      const deployments = await listDeployments(
        projectId,
        parseInt(options.limit, 10)
      );

      const formattedDeployments = deployments.map((d) => ({
        id: d.uid,
        url: d.url,
        state: formatDeploymentState(d.state || d.readyState),
        target: d.target || 'preview',
        created: formatTimestamp(d.created || d.createdAt),
        creator: d.creator?.username,
        inspectorUrl: d.inspectorUrl,
      }));

      output(formatDeploymentList(projectArg || 'all', formattedDeployments));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
