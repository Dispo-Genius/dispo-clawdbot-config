import { Command } from 'commander';
import { execFileSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { output, errorOutput } from '../utils/output';
import { clawdbot } from '../utils/exec';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4100';
const INBOX_ID = 'amusedbattle808@agentmail.to';

interface WebhookEvent {
  id: number;
  event_type: string;
  mailbox_id: string | null;
  thread_id: string | null;
  message_id: string | null;
  payload: string;
  received_at: string;
}

interface EmailMessage {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  createdAt: string;
}

// Track processed event IDs to avoid duplicates
let lastProcessedId = 0;

async function fetchWebhookEvents(since?: string): Promise<WebhookEvent[]> {
  const url = new URL(`${GATEWAY_URL}/webhook/agentmail/events`);
  if (since) {
    url.searchParams.set('since', since);
  }
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  const data = await response.json() as { events?: WebhookEvent[] };
  return data.events || [];
}

function gatewayExec(service: string, command: string, args: string[]): string {
  const gatewayPath = path.join(os.homedir(), '.claude/tools/gateway-cc/src/index.ts');
  try {
    let output = execFileSync('npx', ['tsx', gatewayPath, 'exec', service, command, ...args], {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    // Strip dotenv logging line if present (e.g., "[dotenv@17.2.3] injecting env...")
    if (output.startsWith('[dotenv')) {
      const newlineIdx = output.indexOf('\n');
      if (newlineIdx !== -1) {
        output = output.slice(newlineIdx + 1);
      }
    }
    return output;
  } catch (error) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    throw new Error(err.stderr?.trim() || err.stdout?.trim() || err.message || `gateway-cc exec ${service} failed`);
  }
}

async function readEmail(inboxId: string, messageId: string): Promise<EmailMessage | null> {
  try {
    const result = gatewayExec('agentmail', 'read', [inboxId, messageId, '--format', 'json']);
    return JSON.parse(result);
  } catch (error) {
    console.error(`Failed to read message ${messageId}:`, error);
    return null;
  }
}

function textToHtml(text: string): string {
  // Convert plain text to HTML with proper formatting
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert markdown-style formatting to HTML
  let html = escaped
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Code: `text`
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links: [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Convert line breaks to paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map(p => {
      // Check if it's a list
      const lines = p.split('\n');
      const isList = lines.every(line => /^[-*•]\s/.test(line.trim()) || line.trim() === '');

      if (isList && lines.some(line => /^[-*•]\s/.test(line.trim()))) {
        const items = lines
          .filter(line => /^[-*•]\s/.test(line.trim()))
          .map(line => `<li>${line.replace(/^[-*•]\s/, '').trim()}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }

      // Regular paragraph - convert single newlines to <br>
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return html;
}

async function sendReply(inboxId: string, toEmail: string, subject: string, text: string): Promise<void> {
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  const html = textToHtml(text);

  try {
    gatewayExec('agentmail', 'send', [
      inboxId,
      '--to', toEmail,
      '--subject', replySubject,
      '--text', text,
      '--html', html,
    ]);
    console.log(`[email-handler] Sent reply to ${toEmail}`);
  } catch (error) {
    console.error(`Failed to send reply to ${toEmail}:`, error);
    throw error;
  }
}

function askPolaris(message: string, context?: string): string {
  const fullMessage = context
    ? `[Email from: ${context}]\n\n${message}`
    : message;

  try {
    const args = ['agent', '--message', fullMessage, '--json', '--agent', 'main', '--timeout', '300'];
    const result = clawdbot(args, { timeout: 330000 });

    try {
      const parsed = JSON.parse(result);
      // Extract text from clawdbot response structure: result.payloads[0].text
      if (parsed.result?.payloads?.[0]?.text) {
        return parsed.result.payloads[0].text;
      }
      // Legacy structure: payloads[0].text
      if (parsed.payloads?.[0]?.text) {
        return parsed.payloads[0].text;
      }
      // Fallback to other common response formats
      return parsed.response || parsed.content || parsed.message || parsed.text || result;
    } catch {
      return result;
    }
  } catch (error) {
    console.error('Polaris error:', error);
    throw error;
  }
}

async function processEvent(event: WebhookEvent): Promise<void> {
  if (event.event_type !== 'message.received') {
    console.log(`[email-handler] Skipping event type: ${event.event_type}`);
    return;
  }

  const payload = JSON.parse(event.payload);
  const messageId = payload.message_id || event.message_id;
  const mailboxId = payload.mailbox_id || event.mailbox_id || INBOX_ID;

  if (!messageId) {
    console.log('[email-handler] No message_id in event, skipping');
    return;
  }

  console.log(`[email-handler] Processing message: ${messageId}`);

  // Read the full email
  const email = await readEmail(mailboxId, messageId);
  if (!email) {
    console.error(`[email-handler] Could not read email ${messageId}`);
    return;
  }

  const emailContent = email.text || email.html || '';
  if (!emailContent.trim()) {
    console.log('[email-handler] Email has no content, skipping');
    return;
  }

  console.log(`[email-handler] Email from: ${email.from}, subject: ${email.subject}`);

  // Ask Polaris
  try {
    const response = askPolaris(emailContent, email.from);
    console.log(`[email-handler] Polaris response: ${response.substring(0, 100)}...`);

    // Send reply
    await sendReply(mailboxId, email.from, email.subject, response);
  } catch (error) {
    console.error(`[email-handler] Failed to process email:`, error);
  }
}

async function runOnce(): Promise<void> {
  console.log('[email-handler] Checking for new emails...');

  // Get events from the last 5 minutes
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const events = await fetchWebhookEvents(since);

  // Filter to only new events
  const newEvents = events.filter(e => e.id > lastProcessedId);

  if (newEvents.length === 0) {
    console.log('[email-handler] No new events');
    return;
  }

  console.log(`[email-handler] Found ${newEvents.length} new event(s)`);

  // Process oldest first
  newEvents.sort((a, b) => a.id - b.id);

  for (const event of newEvents) {
    await processEvent(event);
    lastProcessedId = Math.max(lastProcessedId, event.id);
  }
}

async function runDaemon(intervalMs: number): Promise<void> {
  console.log(`[email-handler] Starting daemon, polling every ${intervalMs / 1000}s`);

  // Initial check
  await runOnce();

  // Poll loop
  setInterval(async () => {
    try {
      await runOnce();
    } catch (error) {
      console.error('[email-handler] Poll error:', error);
    }
  }, intervalMs);
}

async function processMessage(messageId: string, mailboxId: string): Promise<void> {
  console.log(`[email-handler] Processing message: ${messageId}`);

  // Read the full email
  const email = await readEmail(mailboxId, messageId);
  if (!email) {
    console.error(`[email-handler] Could not read email ${messageId}`);
    return;
  }

  const emailContent = email.text || email.html || '';
  if (!emailContent.trim()) {
    console.log('[email-handler] Email has no content, skipping');
    return;
  }

  console.log(`[email-handler] Email from: ${email.from}, subject: ${email.subject}`);

  // Ask Polaris
  try {
    const response = askPolaris(emailContent, email.from);
    console.log(`[email-handler] Polaris response: ${response.substring(0, 100)}...`);

    // Send reply
    await sendReply(mailboxId, email.from, email.subject, response);
  } catch (error) {
    console.error(`[email-handler] Failed to process email:`, error);
  }
}

export const emailHandler = new Command('email-handler')
  .description('Handle incoming emails and respond via Polaris')
  .option('--daemon', 'Run as a daemon, continuously polling for new emails')
  .option('--interval <seconds>', 'Polling interval in seconds (daemon mode)', '30')
  .option('--message-id <id>', 'Process a specific message directly (webhook-triggered)')
  .option('--mailbox-id <id>', 'Mailbox ID for direct message processing')
  .action(async (options: {
    daemon?: boolean;
    interval?: string;
    messageId?: string;
    mailboxId?: string;
  }) => {
    try {
      // Direct message processing (webhook-triggered, no polling)
      if (options.messageId) {
        const mailboxId = options.mailboxId || INBOX_ID;
        await processMessage(options.messageId, mailboxId);
        output('Message processed');
        return;
      }

      // Legacy polling modes
      if (options.daemon) {
        const intervalMs = parseInt(options.interval || '30', 10) * 1000;
        await runDaemon(intervalMs);
      } else {
        await runOnce();
        output('Email handler completed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
