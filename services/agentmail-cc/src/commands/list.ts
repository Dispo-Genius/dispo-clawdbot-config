import { getApiKey } from '../api/client.js';
import { formatMessageList, errorOutput, type OutputOptions } from '../utils/output.js';

interface MessageItem {
  messageId?: string;
  message_id?: string;
  from?: string;
  from_?: string;
  subject?: string;
  createdAt?: string;
  created_at?: string;
}

export async function listCommand(inboxId: string, options: { limit?: number } & OutputOptions): Promise<void> {
  if (!inboxId) {
    errorOutput('Inbox ID is required');
  }

  try {
    const apiKey = getApiKey();
    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      errorOutput(`API error ${response.status}: ${text}`);
      return;
    }

    const data = await response.json() as { messages?: MessageItem[]; count?: number };
    let messages = (data.messages || []).map((m: MessageItem) => ({
      messageId: m.messageId || m.message_id,
      from: m.from || m.from_,
      subject: m.subject,
      createdAt: m.createdAt || m.created_at,
    }));

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      messages = messages.slice(0, options.limit);
    }

    console.log(formatMessageList(messages, options));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        errorOutput(`Inbox not found: ${inboxId}`);
      } else {
        errorOutput(error.message, error);
      }
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}
