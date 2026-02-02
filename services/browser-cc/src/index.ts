#!/usr/bin/env npx tsx
/**
 * browser-cc: Gateway wrapper for agent-browser CLI
 *
 * Passthrough to `agent-browser` for browser automation.
 * Enables Polaris to automate browser flows (OAuth, etc.) on Mac Mini.
 *
 * Usage: gateway-cc exec browser <command> [args...]
 */

import { spawn } from 'child_process';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
  console.log(`browser-cc: Gateway wrapper for agent-browser CLI

Usage: gateway-cc exec browser <command> [args...]

Commands (forwarded to agent-browser):
  open <url>                    Navigate to URL
  screenshot <path>             Save screenshot to file
  snapshot                      Get accessibility tree (for element selectors)
  click <selector>              Click element (e.g., "text=Sign in")
  type <selector> <text>        Type text into element
  get <property>                Get browser property (url, title, cookies)
  eval <js>                     Execute JavaScript in page
  wait <selector|ms>            Wait for element or milliseconds
  close                         Close browser

Selectors:
  text=Button                   Match by visible text
  #id                           Match by ID
  .class                        Match by class
  [attr=value]                  Match by attribute
  css=div.foo                   CSS selector
  xpath=//div                   XPath selector

Examples:
  gateway-cc exec browser open "https://accounts.google.com"
  gateway-cc exec browser screenshot /tmp/auth.png
  gateway-cc exec browser click "text=Sign in"
  gateway-cc exec browser type "input[type=email]" "user@example.com"
  gateway-cc exec browser get cookies
`);
  process.exit(0);
}

// Forward to agent-browser CLI
const child = spawn('agent-browser', args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error('Error: agent-browser not found. Install with: npm install -g agent-browser');
    process.exit(1);
  }
  console.error(`Error spawning agent-browser: ${err.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
