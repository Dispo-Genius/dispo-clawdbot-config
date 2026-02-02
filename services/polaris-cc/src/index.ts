#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat } from './utils/output';
import type { OutputFormat } from './types';

// Import commands
import { send } from './commands/send';
import { sendImage } from './commands/send-image';
import { status } from './commands/status';
import { sessions } from './commands/sessions';
import { read } from './commands/read';
import { emailHandler } from './commands/email-handler';

const program = new Command();

program
  .name('polaris-cc')
  .description('Polaris AI assistant CLI for Claude Code')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: compact (default), json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Register commands
program.addCommand(send);
program.addCommand(sendImage);
program.addCommand(status);
program.addCommand(sessions);
program.addCommand(read);
program.addCommand(emailHandler);

// Parse and execute
program.parse(process.argv);
