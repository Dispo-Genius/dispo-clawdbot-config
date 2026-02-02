#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat } from './utils/output';
import { list } from './commands/list';
import { info } from './commands/info';
import { status } from './commands/status';
import { restructure } from './commands/restructure';
import { indexCmd } from './commands/index-cmd';
import { addReference } from './commands/add-reference';
import { listReferences } from './commands/list-references';
import { getReference } from './commands/get-reference';

type OutputFormat = 'json' | 'table' | 'compact';

const program = new Command();

program
  .name('spec-cc')
  .description('Spec CLI for Claude Code')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Register commands
program.addCommand(list);
program.addCommand(info);
program.addCommand(status);
program.addCommand(restructure);
program.addCommand(indexCmd);
program.addCommand(addReference);
program.addCommand(listReferences);
program.addCommand(getReference);

// Configure help-on-error for all subcommands
program.commands.forEach(cmd => cmd.showHelpAfterError(true));

// Parse and execute
program.parse(process.argv);
