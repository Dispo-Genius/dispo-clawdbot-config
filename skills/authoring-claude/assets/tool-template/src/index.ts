#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat } from './utils/output';
import type { OutputFormat } from './types';

// Import commands
import { status } from './commands/status';

const program = new Command();

program
  .name('my-tool-cc')
  .description('My Tool CLI wrapper for Claude Code with compact output')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: compact (default), json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Register commands
program.addCommand(status);

// Parse and execute
program.parse(process.argv);
