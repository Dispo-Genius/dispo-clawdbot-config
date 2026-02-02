#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load .env from project root BEFORE any other imports
// This must happen synchronously before dynamic imports
const envPaths = [
  resolve(process.cwd(), '.env'),                    // CWD (project root when run from there)
  resolve(__dirname, '../../../../.env'),             // Project root relative to this file
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true, quiet: true });
    break;
  }
}

// Now dynamically import the rest after env is loaded
async function main() {
  const { Command } = await import('commander');
  const { setGlobalFormat } = await import('./utils/output');
  type OutputFormat = 'json' | 'table' | 'compact';
  const { sync } = await import('./commands/sync');
  const { sendMessage } = await import('./commands/send-message');
  const { scheduleMessage } = await import('./commands/schedule-message');
  const { sendDm } = await import('./commands/send-dm');
  const { listChannels } = await import('./commands/list-channels');
  const { listMembers } = await import('./commands/list-members');
  const { getHistory } = await import('./commands/get-history');
  const { uploadFile } = await import('./commands/upload-file');
  const { editMessage } = await import('./commands/edit-message');
  const { deleteMessage } = await import('./commands/delete-message');
  const { sendRichMessage } = await import('./commands/send-rich-message');
  const { createChannel } = await import('./commands/create-channel');
  const { react } = await import('./commands/react');
  const { reactions } = await import('./commands/reactions');
  const { pin } = await import('./commands/pin');
  const { unpin } = await import('./commands/unpin');
  const { listPins } = await import('./commands/list-pins');
  const { memberInfo } = await import('./commands/member-info');
  const { emojiList } = await import('./commands/emoji-list');

  const program = new Command();

  program
    .name('slack-cc')
    .description('Slack CLI for Claude Code')
    .version('1.0.0')
    .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
        setGlobalFormat(opts.format as OutputFormat);
      }
    });

  // Register commands
  program.addCommand(sync);
  program.addCommand(sendMessage);
  program.addCommand(scheduleMessage);
  program.addCommand(sendDm);
  program.addCommand(listChannels);
  program.addCommand(listMembers);
  program.addCommand(getHistory);
  program.addCommand(uploadFile);
  program.addCommand(editMessage);
  program.addCommand(deleteMessage);
  program.addCommand(sendRichMessage);
  program.addCommand(createChannel);
  program.addCommand(react);
  program.addCommand(reactions);
  program.addCommand(pin);
  program.addCommand(unpin);
  program.addCommand(listPins);
  program.addCommand(memberInfo);
  program.addCommand(emojiList);

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  // Parse and execute
  program.parse(process.argv);
}

main().catch(console.error);
