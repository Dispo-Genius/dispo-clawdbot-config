#!/usr/bin/env npx tsx
/**
 * gog-cc: Gateway wrapper for gog (Google OAuth CLI)
 *
 * Passthrough to `gog` CLI which handles OAuth tokens and multi-account.
 * For Polaris: uses its own Google account (not Andy's).
 *
 * Usage: gateway-cc exec gog <command> [args...]
 * Commands forwarded to gog: gmail, calendar, drive, auth
 */

import { spawn } from 'child_process';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.log(`gog-cc: Gateway wrapper for gog CLI

Usage: gateway-cc exec gog <command> [args...]

Commands (forwarded to gog):
  gmail list [--account <email>]              List inbox messages
  gmail read <message-id>                     Read a message
  gmail send --to <email> --subject <subj>    Send email
  calendar list [--account <email>]           List calendar events
  calendar create <title> --start <time>      Create event
  drive list [--account <email>]              List files
  drive get <file-id>                         Get file info
  auth list                                   List authenticated accounts
  auth add <email>                            Add new account (interactive)

Account Selection:
  gog uses the default account unless --account is specified.
  Each machine has its own OAuth tokens in ~/.config/gog/

For Polaris: authenticate once with \`gog auth add polaris-ai@gmail.com\`
`);
  process.exit(0);
}

// Forward to gog CLI
const child = spawn('gog', [command, ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error('Error: gog CLI not found. Install with: npm install -g gog');
    process.exit(1);
  }
  console.error(`Error spawning gog: ${err.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
