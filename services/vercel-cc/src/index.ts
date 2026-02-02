#!/usr/bin/env node

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple locations
const envPaths = [
  join(process.cwd(), '.env'),
  resolve(__dirname, '..', '.env'),
  join(homedir(), '.claude', '.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

// Validate required environment variable
if (!process.env.VERCEL_TOKEN) {
  console.log(
    JSON.stringify({
      success: false,
      error:
        'VERCEL_TOKEN environment variable is not set. Set it in .env or ~/.claude/.env',
    })
  );
  process.exit(1);
}

// Import commands after env is loaded
const { program } = await import('commander');
const { setGlobalFormat } = await import('./utils/output.js');
type OutputFormat = 'json' | 'table' | 'compact';
const { syncCommand } = await import('./commands/sync.js');
const { listProjectsCommand } = await import('./commands/list-projects.js');
const { getProjectCommand } = await import('./commands/get-project.js');
const { listDeploymentsCommand } = await import('./commands/list-deployments.js');
const { getDeploymentCommand } = await import('./commands/get-deployment.js');
const { promoteCommand } = await import('./commands/promote.js');
const { cancelDeploymentCommand } = await import('./commands/cancel-deployment.js');
const { listEnvCommand } = await import('./commands/list-env.js');
const { addEnvCommand } = await import('./commands/add-env.js');
const { removeEnvCommand } = await import('./commands/remove-env.js');
const { listDomainsCommand } = await import('./commands/list-domains.js');
const { addDomainCommand } = await import('./commands/add-domain.js');

program
  .name('vercel-cc')
  .description('Vercel CLI tool for Claude Code')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Register all commands
program.addCommand(syncCommand);
program.addCommand(listProjectsCommand);
program.addCommand(getProjectCommand);
program.addCommand(listDeploymentsCommand);
program.addCommand(getDeploymentCommand);
program.addCommand(promoteCommand);
program.addCommand(cancelDeploymentCommand);
program.addCommand(listEnvCommand);
program.addCommand(addEnvCommand);
program.addCommand(removeEnvCommand);
program.addCommand(listDomainsCommand);
program.addCommand(addDomainCommand);

// Configure help-on-error for all subcommands
program.commands.forEach(cmd => cmd.showHelpAfterError(true));

program.parse(process.argv);
