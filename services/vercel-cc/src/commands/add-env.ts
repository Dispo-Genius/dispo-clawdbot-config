import { Command } from 'commander';
import { createEnvVar } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatMutationResult, errorOutput } from '../utils/output.js';

export const addEnvCommand = new Command('add-env')
  .description('Add an environment variable to a project')
  .argument('<project>', 'Project ID or name')
  .argument('<key>', 'Environment variable key')
  .argument('<value>', 'Environment variable value')
  .option(
    '--target <targets>',
    'Comma-separated targets: production,preview,development',
    'production,preview,development'
  )
  .option(
    '--type <type>',
    'Variable type: plain, secret, encrypted, sensitive',
    'encrypted'
  )
  .option('--comment <comment>', 'Description/comment for the variable')
  .action(async (projectArg, key, value, options) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      const targets = options.target.split(',').map((t: string) => t.trim()) as (
        | 'production'
        | 'preview'
        | 'development'
      )[];

      const validTargets = ['production', 'preview', 'development'];
      for (const t of targets) {
        if (!validTargets.includes(t)) {
          throw new Error(
            `Invalid target "${t}". Must be one of: ${validTargets.join(', ')}`
          );
        }
      }

      const validTypes = ['plain', 'secret', 'encrypted', 'sensitive'];
      if (!validTypes.includes(options.type)) {
        throw new Error(
          `Invalid type "${options.type}". Must be one of: ${validTypes.join(', ')}`
        );
      }

      const result = await createEnvVar(projectId, {
        key,
        value,
        type: options.type as 'plain' | 'secret' | 'encrypted' | 'sensitive',
        target: targets,
        comment: options.comment,
      });

      const created = result.created[0];

      output(formatMutationResult('Added', {
        key,
        project: projectArg,
        type: created?.type,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
