#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat, type OutputFormat } from './utils/output';
import { scan } from './commands/scan';
import { historyScan } from './commands/history-scan';
import { install } from './commands/install';
import { cron } from './commands/cron';
import { status } from './commands/status';
import { config } from './commands/config';

const program = new Command();

program
  .name('security-cc')
  .description('Security scanning CLI for Claude Code')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: compact (default), json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Register commands
program.addCommand(scan);
program.addCommand(historyScan);
program.addCommand(install);
program.addCommand(cron);
program.addCommand(status);
program.addCommand(config);

// Configure help-on-error for all subcommands
program.commands.forEach((cmd) => cmd.showHelpAfterError(true));

// Parse and execute
program.parse(process.argv);
