import { getApiKey } from '../api/client.js';
import { formatMessage, errorOutput, type OutputOptions } from '../utils/output.js';

export async function readCommand(inboxId: string, messageId: string, options: OutputOptions = {}): Promise<void> {
  if (!inboxId) {
    errorOutput('Inbox ID is required');
  }

  if (!messageId) {
    errorOutput('Message ID is required');
  }

  try {
    const apiKey = getApiKey();
    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 404) {
        errorOutput(`Message not found: ${messageId}`);
      } else {
        errorOutput(`API error ${response.status}: ${text}`);
      }
      return;
    }

    const message = await response.json() as Record<string, unknown>;
    console.log(formatMessage(message, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}
