#!/usr/bin/env node

import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { listCommand } from './commands/list.js';
import { readCommand } from './commands/read.js';
import { draftCommand } from './commands/draft.js';
import { searchCommand } from './commands/search.js';
import { listDraftsCommand, deleteDraftCommand } from './commands/drafts.js';
import { replyCommand } from './commands/reply.js';
import type { OutputFormat } from './utils/output.js';

const program = new Command();

// Global options for output format
function addOutputOptions(cmd: Command): Command {
  return cmd
    .option('-f, --format <format>', 'Output format: json, table, quiet', 'json')
    .option('-q, --quiet', 'Suppress output (shorthand for --format quiet)');
}

function getOutputOptions(options: { format?: string; quiet?: boolean }): { format: OutputFormat } {
  if (options.quiet) return { format: 'quiet' };
  return { format: (options.format as OutputFormat) || 'json' };
}

program
  .name('gmail-cc')
  .description('Gmail CLI tool for Claude Code')
  .version('1.0.0');

program
  .command('auth')
  .description('Authenticate with Gmail using OAuth')
  .option('--logout', 'Clear saved tokens and logout')
  .option('--status', 'Check authentication status')
  .action(authCommand);

addOutputOptions(
  program
    .command('list')
    .description('List recent emails')
    .option('-l, --limit <number>', 'Number of emails to list', '10')
).action((options) => {
  listCommand({
    limit: parseInt(options.limit, 10),
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  program
    .command('read <messageId>')
    .description('Read email content by message ID')
).action((messageId, options) => {
  readCommand(messageId, getOutputOptions(options));
});

addOutputOptions(
  program
    .command('draft')
    .description('Create an email draft (does NOT send)')
    .requiredOption('--to <email>', 'Recipient email address')
    .requiredOption('--subject <subject>', 'Email subject')
    .requiredOption('--body <body>', 'Email body')
    .option('--cc <email>', 'CC recipient(s), comma-separated')
    .option('--bcc <email>', 'BCC recipient(s), comma-separated')
    .option('--html', 'Send as HTML email (auto-detected if body contains HTML tags)')
).action((options) => {
  draftCommand({
    ...options,
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  program
    .command('search <query>')
    .description('Search emails using Gmail query syntax')
    .option('-l, --limit <number>', 'Max results to return', '10')
).action((query, options) => {
  searchCommand(query, {
    limit: parseInt(options.limit, 10),
    ...getOutputOptions(options),
  });
});

// Drafts subcommands
const draftsCmd = program
  .command('drafts')
  .description('Manage email drafts');

addOutputOptions(
  draftsCmd
    .command('list')
    .description('List all drafts')
    .option('-l, --limit <number>', 'Number of drafts to list', '10')
).action((options) => {
  listDraftsCommand({
    limit: parseInt(options.limit, 10),
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  draftsCmd
    .command('delete <draftId>')
    .description('Delete a draft')
).action((draftId, options) => {
  deleteDraftCommand(draftId, getOutputOptions(options));
});

// Reply command (creates draft reply)
addOutputOptions(
  program
    .command('reply <messageId>')
    .description('Create a reply draft to a message (does NOT send)')
    .requiredOption('--body <body>', 'Reply body')
).action((messageId, options) => {
  replyCommand(messageId, {
    body: options.body,
    ...getOutputOptions(options),
  });
});

// Configure help-on-error for all subcommands
program.commands.forEach(cmd => cmd.showHelpAfterError(true));

program.parse();
