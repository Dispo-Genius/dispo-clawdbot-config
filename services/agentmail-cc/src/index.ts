#!/usr/bin/env node

import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { inboxCreateCommand, inboxListCommand, inboxGetCommand } from './commands/inbox.js';
import { sendCommand } from './commands/send.js';
import { listCommand } from './commands/list.js';
import { readCommand } from './commands/read.js';
import {
  webhookRegisterCommand,
  webhookListCommand,
  webhookEventsCommand,
  webhookDeleteCommand,
} from './commands/webhook.js';
import type { OutputOptions } from './utils/output.js';

type OutputFormat = 'json' | 'table' | 'compact';

const program = new Command();

function addOutputOptions(cmd: Command): Command {
  return cmd
    .option('-f, --format <format>', 'Output format: json, table, compact', 'json')
    .option('-q, --quiet', 'Suppress output (shorthand for --format quiet)');
}

function getOutputOptions(options: { format?: string; quiet?: boolean }): OutputOptions {
  if (options.quiet) return { format: 'compact' };
  return { format: (options.format as OutputFormat) || 'json' };
}

program
  .name('agentmail-cc')
  .description('AgentMail CLI tool for Claude Code')
  .version('1.0.0');

// Auth command
program
  .command('auth')
  .description('Check AgentMail API key status')
  .option('--status', 'Check API key status')
  .action(authCommand);

// Inbox subcommands
const inboxCmd = program
  .command('inbox')
  .description('Manage AgentMail inboxes');

addOutputOptions(
  inboxCmd
    .command('create')
    .description('Create a new inbox')
    .option('--display-name <name>', 'Display name for the inbox')
).action((options) => {
  inboxCreateCommand({
    displayName: options.displayName,
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  inboxCmd
    .command('list')
    .description('List all inboxes')
).action((options) => {
  inboxListCommand(getOutputOptions(options));
});

addOutputOptions(
  inboxCmd
    .command('get <inboxId>')
    .description('Get inbox details by ID')
).action((inboxId, options) => {
  inboxGetCommand(inboxId, getOutputOptions(options));
});

// Send command
addOutputOptions(
  program
    .command('send <inboxId>')
    .description('Send email from inbox')
    .requiredOption('--to <email>', 'Recipient email address')
    .requiredOption('--subject <subject>', 'Email subject')
    .requiredOption('--text <text>', 'Email body (plain text)')
    .option('--html <html>', 'Email body (HTML)')
).action((inboxId, options) => {
  sendCommand(inboxId, {
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    ...getOutputOptions(options),
  });
});

// List messages command
addOutputOptions(
  program
    .command('list <inboxId>')
    .description('List messages in inbox')
    .option('-l, --limit <number>', 'Number of messages to list', '10')
).action((inboxId, options) => {
  listCommand(inboxId, {
    limit: parseInt(options.limit, 10),
    ...getOutputOptions(options),
  });
});

// Read message command
addOutputOptions(
  program
    .command('read <inboxId> <messageId>')
    .description('Read message content')
).action((inboxId, messageId, options) => {
  readCommand(inboxId, messageId, getOutputOptions(options));
});

// Webhook subcommands
const webhookCmd = program
  .command('webhook')
  .description('Manage AgentMail webhooks');

addOutputOptions(
  webhookCmd
    .command('register <inboxId> <callbackUrl>')
    .description('Register a webhook for an inbox')
).action((inboxId, callbackUrl, options) => {
  webhookRegisterCommand({
    inboxId,
    callbackUrl,
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  webhookCmd
    .command('list')
    .description('List all webhooks')
    .option('--inbox-id <id>', 'Filter by inbox ID')
).action((options) => {
  webhookListCommand({
    inboxId: options.inboxId,
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  webhookCmd
    .command('events')
    .description('Query stored webhook events from gateway')
    .option('--since <time>', 'Return events since time (e.g., 5m, 1h, 2d, or ISO timestamp)')
    .option('--mailbox-id <id>', 'Filter by mailbox ID')
    .option('-l, --limit <number>', 'Max events to return', '100')
).action((options) => {
  webhookEventsCommand({
    since: options.since,
    mailboxId: options.mailboxId,
    limit: options.limit ? parseInt(options.limit, 10) : 100,
    ...getOutputOptions(options),
  });
});

addOutputOptions(
  webhookCmd
    .command('delete <webhookId>')
    .description('Delete a webhook')
).action((webhookId, options) => {
  webhookDeleteCommand({
    webhookId,
    ...getOutputOptions(options),
  });
});

// Configure help-on-error for all subcommands
program.commands.forEach(cmd => cmd.showHelpAfterError(true));

program.parse();
