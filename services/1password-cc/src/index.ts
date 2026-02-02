#!/usr/bin/env node

import { Command } from 'commander';
import { getCommand } from './commands/get.js';
import { setCommand } from './commands/set.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';

const program = new Command();

program
  .name('1password-cc')
  .description('1Password credential storage for Polaris')
  .version('1.0.0');

program.addCommand(getCommand);
program.addCommand(setCommand);
program.addCommand(listCommand);
program.addCommand(deleteCommand);

program.parse();
