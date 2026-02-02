import { Command } from 'commander';
import { listEnvVars, formatTimestamp } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatEnvVarList, errorOutput } from '../utils/output.js';

export const listEnvCommand = new Command('list-env')
  .description('List environment variables for a project')
  .argument('<project>', 'Project ID or name')
  .option('--show-values', 'Show decrypted values (if available)')
  .action(async (projectArg, options) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      const envVars = await listEnvVars(projectId);

      const formattedEnvVars = envVars.map((env) => ({
        key: env.key,
        type: env.type,
        target: env.target,
      }));

      output(formatEnvVarList(projectArg, formattedEnvVars));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
