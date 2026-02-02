#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Load .env from multiple locations BEFORE any other imports
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(homedir(), '.claude/.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true, debug: false });
    break;
  }
}

// Now dynamically import the rest after env is loaded
async function main() {
  const { Command } = await import('commander');
  const { setGlobalFormat } = await import('./utils/output');
  type OutputFormat = 'json' | 'compact';

  const { sync } = await import('./commands/sync');
  const { listTickets } = await import('./commands/list-tickets');
  const { getTicket } = await import('./commands/get-ticket');
  const { replyTicket } = await import('./commands/reply-ticket');
  const { updateTicket } = await import('./commands/update-ticket');
  const { closeTicket } = await import('./commands/close-ticket');
  const { searchKb } = await import('./commands/search-kb');
  const { getUser } = await import('./commands/get-user');
  const { createOutreach } = await import('./commands/create-outreach');

  const program = new Command();

  program
    .name('gleap-cc')
    .description('Gleap CLI for Claude Code / Clawdbot - Customer Service Integration')
    .version('1.0.0')
    .showHelpAfterError(true)
    .option('-f, --format <format>', 'Output format: compact (default), json', 'compact')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.format && ['compact', 'json'].includes(opts.format)) {
        setGlobalFormat(opts.format as OutputFormat);
      }
    });

  // Register commands
  program.addCommand(sync);
  program.addCommand(listTickets);
  program.addCommand(getTicket);
  program.addCommand(replyTicket);
  program.addCommand(updateTicket);
  program.addCommand(closeTicket);
  program.addCommand(searchKb);
  program.addCommand(getUser);
  program.addCommand(createOutreach);

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  // Parse and execute
  program.parse(process.argv);
}

main().catch(console.error);
