import { Command } from 'commander';
import { promoteDeployment } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatMutationResult, errorOutput } from '../utils/output.js';

export const promoteCommand = new Command('promote')
  .description('Promote a deployment to production (no rebuild)')
  .argument('<project>', 'Project ID or name')
  .argument('<deployment>', 'Deployment ID to promote')
  .action(async (projectArg, deploymentId) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      const result = await promoteDeployment(projectId, deploymentId);

      output(formatMutationResult('Promoted', {
        deployment: deploymentId,
        project: projectArg,
        jobId: result.jobId,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
