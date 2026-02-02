#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat, type OutputFormat } from './utils/output.js';
import { devices } from './commands/devices.js';
import { status } from './commands/status.js';
import { dns } from './commands/dns.js';
import { funnelEnable } from './commands/funnel-enable.js';
import { funnelDisable } from './commands/funnel-disable.js';

const program = new Command();

program
  .name('tailscale-cc')
  .description('Tailscale CLI for Claude Code with gateway credential injection')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: json, table, compact', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

program.addCommand(devices);
program.addCommand(status);
program.addCommand(dns);
program.addCommand(funnelEnable);
program.addCommand(funnelDisable);

program.parse();
