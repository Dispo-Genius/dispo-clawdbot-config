import { getGmailClient } from '../api/client.js';
import { withRetry } from '../utils/retry.js';
import { validateDraftInput } from '../utils/validation.js';
import { output, errorOutput, type OutputOptions } from '../utils/output.js';
import type { EmailHeader } from '../types.js';

function getHeader(headers: EmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function createReplyRawEmail(options: {
  to: string;
  subject: string;
  body: string;
  inReplyTo: string;
  references: string;
}): string {
  const { to, subject, body, inReplyTo, references } = options;

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${inReplyTo}`,
    `References: ${references}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ];

  const email = `${headers.join('\r\n')}\r\n\r\n${body}`;

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function replyCommand(
  messageId: string,
  options: { body: string } & OutputOptions
): Promise<void> {
  if (!messageId) {
    errorOutput('Message ID is required');
    process.exit(1);
  }

  if (!options.body) {
    errorOutput('--body is required');
    process.exit(1);
  }

  try {
    const gmail = await getGmailClient();

    // Fetch original message to get headers
    const original = await withRetry(() =>
      gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Message-ID', 'References'],
      })
    );

    const headers = original.data.payload?.headers as EmailHeader[] | undefined;
    const from = getHeader(headers, 'From');
    const originalSubject = getHeader(headers, 'Subject');
    const originalMessageId = getHeader(headers, 'Message-ID');
    const originalRefs = getHeader(headers, 'References');

    // Build reply subject
    const subject = originalSubject.startsWith('Re:')
      ? originalSubject
      : `Re: ${originalSubject}`;

    // Build references chain
    const references = originalRefs
      ? `${originalRefs} ${originalMessageId}`
      : originalMessageId;

    // Validate
    const validation = validateDraftInput({
      to: from,
      subject,
      body: options.body,
    });

    if (!validation.valid) {
      errorOutput('Validation failed:\n' + validation.errors.join('\n'));
      process.exit(1);
    }

    const raw = createReplyRawEmail({
      to: from,
      subject,
      body: options.body,
      inReplyTo: originalMessageId,
      references,
    });

    // Create reply as draft
    const response = await withRetry(() =>
      gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw,
            threadId: original.data.threadId,
          },
        },
      })
    );

    output(
      {
        success: true,
        draftId: response.data.id,
        threadId: original.data.threadId,
        replyTo: from,
        subject,
        note: 'Reply draft created. Open Gmail to review and send manually.',
      },
      options
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        errorOutput(`Message not found: ${messageId}`);
      } else {
        errorOutput(error.message, error);
      }
    } else {
      errorOutput('Unknown error occurred');
    }
    process.exit(1);
  }
}
