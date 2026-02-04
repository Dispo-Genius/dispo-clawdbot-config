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

  // Import GitHub commands
  const { sync } = await import('./commands/sync');
  const { prView } = await import('./commands/pr-view');
  const { prList } = await import('./commands/pr-list');
  const { prCreate } = await import('./commands/pr-create');
  const { prEdit } = await import('./commands/pr-edit');
  const { prReview } = await import('./commands/pr-review');
  const { prMerge } = await import('./commands/pr-merge');
  const { prClose } = await import('./commands/pr-close');
  const { prChecks } = await import('./commands/pr-checks');
  const { prDeployments } = await import('./commands/pr-deployments');
  const { issueView } = await import('./commands/issue-view');
  const { issueList } = await import('./commands/issue-list');
  const { comments } = await import('./commands/comments');

  // Import Git commands
  const { status } = await import('./commands/status');
  const { diff } = await import('./commands/diff');
  const { conflicts } = await import('./commands/conflicts');
  const { fetch } = await import('./commands/fetch');
  const { rebase } = await import('./commands/rebase');
  const { resolve: resolveCmd } = await import('./commands/resolve');
  const { stage } = await import('./commands/stage');
  const { abort } = await import('./commands/abort');
  const { stash } = await import('./commands/stash');
  const { commit } = await import('./commands/commit');
  const { push } = await import('./commands/push');
  const { log } = await import('./commands/log');
  const { branch } = await import('./commands/branch');
  const { clone } = await import('./commands/clone');
  const { reset } = await import('./commands/reset');
  const { runList } = await import('./commands/run-list');
  const { runView } = await import('./commands/run-view');
  const { api } = await import('./commands/api');
  const { worktree } = await import('./commands/worktree');

  const program = new Command();

  program
    .name('github-cc')
    .description('GitHub CLI wrapper for Claude Code with compact output')
    .version('1.0.0')
    .showHelpAfterError(true)
    .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
        setGlobalFormat(opts.format as OutputFormat);
      }
    });

  // Register GitHub commands
  program.addCommand(sync);
  program.addCommand(prView);
  program.addCommand(prList);
  program.addCommand(prCreate);
  program.addCommand(prEdit);
  program.addCommand(prReview);
  program.addCommand(prMerge);
  program.addCommand(prClose);
  program.addCommand(prChecks);
  program.addCommand(prDeployments);
  program.addCommand(issueView);
  program.addCommand(issueList);
  program.addCommand(comments);

  // Register Git commands
  program.addCommand(status);
  program.addCommand(diff);
  program.addCommand(conflicts);
  program.addCommand(fetch);
  program.addCommand(rebase);
  program.addCommand(resolveCmd);
  program.addCommand(stage);
  program.addCommand(abort);
  program.addCommand(stash);
  program.addCommand(commit);
  program.addCommand(push);
  program.addCommand(log);
  program.addCommand(branch);
  program.addCommand(clone);
  program.addCommand(reset);
  program.addCommand(runList);
  program.addCommand(runView);
  program.addCommand(api);
  program.addCommand(worktree);

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  // Parse and execute
  program.parse(process.argv);
}

main().catch(console.error);
