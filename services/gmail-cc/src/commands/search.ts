import { getGmailClient } from '../api/client.js';
import { withRetry } from '../utils/retry.js';
import { output, errorOutput, type OutputOptions } from '../utils/output.js';
import type { EmailSummary, EmailHeader } from '../types.js';

function getHeader(headers: EmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

export async function searchCommand(
  query: string,
  options: { limit?: number } & OutputOptions
): Promise<void> {
  if (!query) {
    errorOutput('Search query is required');
    console.error('\nExamples:');
    console.error('  gmail-cc search "from:example@gmail.com"');
    console.error('  gmail-cc search "subject:invoice"');
    console.error('  gmail-cc search "is:unread"');
    console.error('  gmail-cc search "has:attachment"');
    console.error('  gmail-cc search "after:2024/01/01 before:2024/12/31"');
    process.exit(1);
  }

  const limit = options.limit || 10;

  try {
    const gmail = await getGmailClient();

    const listResponse = await withRetry(() =>
      gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: limit,
      })
    );

    const messages = listResponse.data.messages || [];

    if (messages.length === 0) {
      output({ results: [], query, count: 0 }, options);
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

      const headers = detail.data.payload?.headers as EmailHeader[] | undefined;

      emails.push({
        id: detail.data.id || '',
        threadId: detail.data.threadId || '',
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        snippet: detail.data.snippet || '',
      });
    }

    output(
      {
        results: emails,
        query,
        count: emails.length,
      },
      options
    );
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
    process.exit(1);
  }
}
