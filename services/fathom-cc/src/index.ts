#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Load .env from project root BEFORE any other imports
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

async function main() {
  const { Command } = await import('commander');
  const { setGlobalFormat } = await import('./utils/output');
  type OutputFormat = 'json' | 'compact';
  const { listMeetings } = await import('./commands/list-meetings');
  const { getMeeting } = await import('./commands/get-meeting');
  const { getTranscript } = await import('./commands/get-transcript');
  const { getSummary } = await import('./commands/get-summary');
  const { getActionItems } = await import('./commands/get-action-items');
  const { search } = await import('./commands/search');
  const { listTeam } = await import('./commands/list-team');

  const program = new Command();

  program
    .name('fathom-cc')
    .description('Fathom.ai CLI for Claude Code')
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
  program.addCommand(listMeetings);
  program.addCommand(getMeeting);
  program.addCommand(getTranscript);
  program.addCommand(getSummary);
  program.addCommand(getActionItems);
  program.addCommand(search);
  program.addCommand(listTeam);

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  program.parse(process.argv);
}

main().catch(console.error);
