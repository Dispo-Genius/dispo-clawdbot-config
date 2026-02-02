#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Load .env from project root BEFORE any other imports
// This must happen synchronously before dynamic imports
const envPaths = [
  resolve(process.cwd(), '.env'),                    // CWD (project root when run from there)
  resolve(__dirname, '../../../../.env'),            // Project root relative to this file
  resolve(homedir(), '.claude/.env'),                // Global ~/.claude/.env fallback
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
  type OutputFormat = 'json' | 'table' | 'compact';
  const { sync } = await import('./commands/sync');
  const { createIssue } = await import('./commands/create-issue');
  const { createProject } = await import('./commands/create-project');
  const { getIssue } = await import('./commands/get-issue');
  const { updateStatus } = await import('./commands/update-status');
  const { updateIssue } = await import('./commands/update-issue');
  const { createComment } = await import('./commands/create-comment');
  const { createDocument } = await import('./commands/create-document');
  const { listIssues } = await import('./commands/list-issues');
  const { searchIssues } = await import('./commands/search-issues');
  const { listProjects } = await import('./commands/list-projects');
  const { listComments } = await import('./commands/list-comments');
  const { listDocuments } = await import('./commands/list-documents');
  const { getDocument } = await import('./commands/get-document');
  const { updateDocument } = await import('./commands/update-document');
  const { uploadAttachment } = await import('./commands/upload-attachment');
  const { logExperiment } = await import('./commands/log-experiment');

  const program = new Command();

  program
    .name('linear-cc')
    .description('Linear CLI for Claude Code')
    .version('1.0.0')
    .showHelpAfterError(true)
    .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
        setGlobalFormat(opts.format as OutputFormat);
      }
    });

  // Register commands
  program.addCommand(sync);
  program.addCommand(createIssue);
  program.addCommand(createProject);
  program.addCommand(getIssue);
  program.addCommand(updateStatus);
  program.addCommand(updateIssue);
  program.addCommand(createComment);
  program.addCommand(createDocument);
  program.addCommand(listIssues);
  program.addCommand(searchIssues);
  program.addCommand(listProjects);
  program.addCommand(listComments);
  program.addCommand(listDocuments);
  program.addCommand(getDocument);
  program.addCommand(updateDocument);
  program.addCommand(uploadAttachment);
  program.addCommand(logExperiment);

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  // Parse and execute
  program.parse(process.argv);
}

main().catch(console.error);
