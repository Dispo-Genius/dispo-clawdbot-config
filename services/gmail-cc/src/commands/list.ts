import { getGmailClient } from '../api/client.js';
import { withRetry } from '../utils/retry.js';
import { output, errorOutput, type OutputOptions } from '../utils/output.js';
import type { EmailSummary, GmailMessage, EmailHeader } from '../types.js';

function getHeader(headers: EmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function parseMessage(message: GmailMessage): EmailSummary {
  const headers = message.payload?.headers as EmailHeader[] | undefined;

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    subject: getHeader(headers, 'Subject'),
    date: getHeader(headers, 'Date'),
    snippet: message.snippet || '',
  };
}

export async function listCommand(options: { limit?: number } & OutputOptions): Promise<void> {
  const limit = options.limit || 10;

  try {
    const gmail = await getGmailClient();

    const listResponse = await withRetry(() =>
      gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
      })
    );

    const messages = listResponse.data.messages || [];

    if (messages.length === 0) {
      output([], options);
      return;
    }

    const emails: EmailSummary[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;

      const detail = await withRetry(() =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        })
      );

      emails.push(parseMessage(detail.data));
    }

    output(emails, options);
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
    process.exit(1);
  }
}
