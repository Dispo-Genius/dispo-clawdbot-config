import { Command } from 'commander';
import { deleteEnvVar, listEnvVars } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatMutationResult, errorOutput } from '../utils/output.js';

export const removeEnvCommand = new Command('remove-env')
  .description('Remove an environment variable from a project')
  .argument('<project>', 'Project ID or name')
  .argument('<key-or-id>', 'Environment variable key or ID')
  .action(async (projectArg, keyOrId) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      // Try to find by key first
      const envVars = await listEnvVars(projectId);
      let envVarId = keyOrId;

      const matchByKey = envVars.find(
        (e) => e.key.toLowerCase() === keyOrId.toLowerCase()
      );
      if (matchByKey) {
        envVarId = matchByKey.id;
      }

      await deleteEnvVar(projectId, envVarId);

      output(formatMutationResult('Removed', {
        key: keyOrId,
        project: projectArg,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
