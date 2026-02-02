import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getAgentMailClient } from '../api/client.js';
import { formatMutationResult, errorOutput, type OutputOptions } from '../utils/output.js';
import { addApprovedRecipient } from '../utils/validation.js';

interface PendingMessage {
  id: string;
  inboxId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  createdAt: string;
}

function getPendingPath(): string {
  return path.join(os.homedir(), '.clawdbot/pending-emails.json');
}

function loadPendingMessages(): PendingMessage[] {
  try {
    const content = fs.readFileSync(getPendingPath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function savePendingMessages(messages: PendingMessage[]): void {
  fs.writeFileSync(getPendingPath(), JSON.stringify(messages, null, 2));
}

export interface ApproveOptions extends OutputOptions {
  addToAllowlist?: boolean;  // Also add recipient to approved list
}

export async function approveCommand(messageId: string, options: ApproveOptions = {}): Promise<void> {
  if (!messageId) {
    errorOutput('Message ID is required');
  }

  const pending = loadPendingMessages();
  const index = pending.findIndex(m => m.id === messageId);

  if (index === -1) {
    errorOutput(`Pending message not found: ${messageId}`);
    return;
  }

  const message = pending[index];

  try {
    const client = getAgentMailClient();

    // Send the queued message
    const sent = await client.messages.send(message.inboxId, {
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    // Remove from pending
    pending.splice(index, 1);
    savePendingMessages(pending);

    // Optionally add to approved recipients
    if (options.addToAllowlist !== false) {
      addApprovedRecipient(message.to);
    }

    console.log(formatMutationResult('message_approved', {
      messageId: sent.messageId,
      to: message.to,
      subject: message.subject,
    }, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

export async function rejectCommand(messageId: string, options: OutputOptions = {}): Promise<void> {
  if (!messageId) {
    errorOutput('Message ID is required');
  }

  const pending = loadPendingMessages();
  const index = pending.findIndex(m => m.id === messageId);

  if (index === -1) {
    errorOutput(`Pending message not found: ${messageId}`);
    return;
  }

  const message = pending[index];

  // Remove from pending
  pending.splice(index, 1);
  savePendingMessages(pending);

  console.log(formatMutationResult('message_rejected', {
    pendingId: messageId,
    to: message.to,
    subject: message.subject,
  }, options));
}

export async function listPendingCommand(options: OutputOptions = {}): Promise<void> {
  const pending = loadPendingMessages();

  if (pending.length === 0) {
    console.log('pending[0]{}:');
    return;
  }

  const lines = pending.map(m =>
    `${m.id}|${m.to}|${m.subject.slice(0, 40)}|${m.createdAt}`
  );

  console.log(`pending[${pending.length}]{id|to|subject|created}:`);
  lines.forEach(l => console.log(l));
}
