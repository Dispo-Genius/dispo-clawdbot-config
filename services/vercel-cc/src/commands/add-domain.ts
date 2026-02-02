import { Command } from 'commander';
import { addDomain, formatTimestamp } from '../api/client.js';
import { loadCache, resolveProjectId, warnIfStale } from '../config/cache.js';
import { output, formatMutationResult, errorOutput } from '../utils/output.js';

export const addDomainCommand = new Command('add-domain')
  .description('Add a domain to a project')
  .argument('<project>', 'Project ID or name')
  .argument('<domain>', 'Domain name to add (e.g., www.example.com)')
  .option('--git-branch <branch>', 'Git branch to associate with domain')
  .option('--redirect <target>', 'Redirect to another domain')
  .option(
    '--redirect-code <code>',
    'Redirect status code: 301, 302, 307, 308',
    '307'
  )
  .action(async (projectArg, domainName, options) => {
    try {
      const cache = loadCache();
      warnIfStale(cache);

      const projectId = resolveProjectId(cache, projectArg) || projectArg;

      const domainConfig: {
        name: string;
        gitBranch?: string;
        redirect?: string;
        redirectStatusCode?: 301 | 302 | 307 | 308;
      } = {
        name: domainName,
      };

      if (options.gitBranch) {
        domainConfig.gitBranch = options.gitBranch;
      }

      if (options.redirect) {
        domainConfig.redirect = options.redirect;
        const code = parseInt(options.redirectCode, 10);
        if ([301, 302, 307, 308].includes(code)) {
          domainConfig.redirectStatusCode = code as 301 | 302 | 307 | 308;
        }
      }

      const domain = await addDomain(projectId, domainConfig);

      output(formatMutationResult('Added domain', {
        name: domain.name,
        verified: domain.verified,
        project: projectArg,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
