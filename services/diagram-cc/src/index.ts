#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat } from './types';
import type { OutputFormat } from './types';

// Import commands
import { get } from './commands/get';
import { search } from './commands/search';
import { tree } from './commands/tree';
import { path } from './commands/path';
import { trace } from './commands/trace';
import { create } from './commands/create';
import { createDiagram } from './commands/create-diagram';
import { update } from './commands/update';
import { deleteCmd } from './commands/delete';
import { move } from './commands/move';
import { connect } from './commands/connect';
import { disconnect } from './commands/disconnect';
import { layout } from './commands/layout';
import { alignCheck } from './commands/align-check';

const program = new Command();

program
  .name('diagram-cc')
  .description('Diagram CLI for Claude Code - CRUD operations on system diagrams')
  .version('1.0.0')
  .showHelpAfterError(true)
  .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Read commands
program.addCommand(get);
program.addCommand(search);
program.addCommand(tree);
program.addCommand(path);
program.addCommand(trace);

// Write commands
program.addCommand(create);
program.addCommand(createDiagram);
program.addCommand(update);
program.addCommand(deleteCmd);
program.addCommand(move);

// Edge commands
program.addCommand(connect);
program.addCommand(disconnect);

// Layout commands
program.addCommand(layout);
program.addCommand(alignCheck);

// Configure help-on-error for all subcommands
program.commands.forEach(cmd => cmd.showHelpAfterError(true));

// Parse and execute
program.parse(process.argv);
