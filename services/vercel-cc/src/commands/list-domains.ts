import { Command } from 'commander';
import { listDomains, formatTimestamp } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatDomainList, errorOutput } from '../utils/output.js';

export const listDomainsCommand = new Command('list-domains')
  .description('List domains for a project')
  .argument('<project>', 'Project ID or name')
  .action(async (projectArg) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      const domains = await listDomains(projectId);

      const formattedDomains = domains.map((d) => ({
        name: d.name,
        apexName: d.apexName,
        verified: d.verified,
      }));

      output(formatDomainList(projectArg, formattedDomains));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
