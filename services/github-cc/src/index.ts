#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat } from './utils/output';
import type { OutputFormat } from './types';

// Import GitHub commands
import { sync } from './commands/sync';
import { prView } from './commands/pr-view';
import { prList } from './commands/pr-list';
import { prCreate } from './commands/pr-create';
import { prReview } from './commands/pr-review';
import { prMerge } from './commands/pr-merge';
import { prClose } from './commands/pr-close';
import { prChecks } from './commands/pr-checks';
import { issueView } from './commands/issue-view';
import { issueList } from './commands/issue-list';
import { comments } from './commands/comments';

// Import Git commands
import { status } from './commands/status';
import { diff } from './commands/diff';
import { conflicts } from './commands/conflicts';
import { fetch } from './commands/fetch';
import { rebase } from './commands/rebase';
import { resolve } from './commands/resolve';
import { stage } from './commands/stage';
import { abort } from './commands/abort';
import { stash } from './commands/stash';
import { commit } from './commands/commit';
import { push } from './commands/push';
import { log } from './commands/log';
import { branch } from './commands/branch';
import { clone } from './commands/clone';
import { runList } from './commands/run-list';
import { runView } from './commands/run-view';
import { api } from './commands/api';
import { worktree } from './commands/worktree';

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
program.addCommand(prReview);
program.addCommand(prMerge);
program.addCommand(prClose);
program.addCommand(prChecks);
program.addCommand(issueView);
program.addCommand(issueList);
program.addCommand(comments);

// Register Git commands
program.addCommand(status);
program.addCommand(diff);
program.addCommand(conflicts);
program.addCommand(fetch);
program.addCommand(rebase);
program.addCommand(resolve);
program.addCommand(stage);
program.addCommand(abort);
program.addCommand(stash);
program.addCommand(commit);
program.addCommand(push);
program.addCommand(log);
program.addCommand(branch);
program.addCommand(clone);
program.addCommand(runList);
program.addCommand(runView);
program.addCommand(api);
program.addCommand(worktree);

// Configure help-on-error for all subcommands
program.commands.forEach(cmd => cmd.showHelpAfterError(true));

// Parse and execute
program.parse(process.argv);
