import { getAgentMailClient } from '../api/client.js';
import { formatMutationResult, errorOutput, type OutputOptions } from '../utils/output.js';

export interface SendOptions extends OutputOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendCommand(inboxId: string, options: SendOptions): Promise<void> {
  if (!inboxId) {
    errorOutput('Inbox ID is required');
  }

  if (!options.to) {
    errorOutput('--to is required');
  }

  if (!options.subject) {
    errorOutput('--subject is required');
  }

  if (!options.text) {
    errorOutput('--text is required');
  }

  try {
    const client = getAgentMailClient();

    const message = await client.messages.send(inboxId, {
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(formatMutationResult('message_sent', {
      messageId: message.messageId,
      to: options.to,
      subject: options.subject,
    }, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}
