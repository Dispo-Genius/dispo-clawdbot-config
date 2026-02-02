#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Load .env from project root BEFORE any other imports
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(homedir(), '.claude/.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true, debug: false });
    break;
  }
}

async function main() {
  const { Command } = await import('commander');
  const { setGlobalFormat } = await import('./utils/output');
  const { transcribe } = await import('./commands/transcribe');
  type OutputFormat = 'json' | 'text' | 'compact';

  const program = new Command();

  program
    .name('whisper-cc')
    .description('Local whisper.cpp speech-to-text CLI')
    .version('1.0.0')
    .option('-f, --format <format>', 'Output format: text (default), json, compact', 'text')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.format && ['text', 'json', 'compact'].includes(opts.format)) {
        setGlobalFormat(opts.format as OutputFormat);
      }
    });

  program.addCommand(transcribe);

  // Configure help-on-error for all subcommands
  program.commands.forEach(cmd => cmd.showHelpAfterError(true));

  program.parse(process.argv);
}

main().catch(console.error);
