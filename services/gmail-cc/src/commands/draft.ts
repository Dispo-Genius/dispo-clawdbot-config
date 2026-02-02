import { getGmailClient } from '../api/client.js';
import { withRetry } from '../utils/retry.js';
import { validateDraftInput } from '../utils/validation.js';
import { output, errorOutput, type OutputOptions } from '../utils/output.js';
import type { SendEmailOptions } from '../types.js';

function plainTextToHtml(text: string): string {
  // Convert plain text to HTML with proper paragraph formatting
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Split by double newlines for paragraphs, single newlines become <br>
  const paragraphs = escaped.split(/\n\n+/).map(p =>
    `<p style="margin: 0 0 1em 0; line-height: 1.5;">${p.replace(/\n/g, '<br>')}</p>`
  );

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 600px;">
${paragraphs.join('\n')}
</body>
</html>`;
}

function createRawEmail(options: SendEmailOptions & { html?: boolean }): string {
  const { to, subject, body, cc, bcc, html } = options;

  // Default to HTML. Only use plain text if explicitly set to false.
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(body);
  const isHtml = html !== false;

  // If HTML mode but body is plain text, convert it
  const finalBody = isHtml && !hasHtmlTags ? plainTextToHtml(body) : body;

  const contentType = isHtml
    ? 'text/html; charset=utf-8'
    : 'text/plain; charset=utf-8';

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
  ];

  if (cc) {
    headers.push(`Cc: ${cc}`);
  }

  if (bcc) {
    headers.push(`Bcc: ${bcc}`);
  }

  const email = `${headers.join('\r\n')}\r\n\r\n${finalBody}`;

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function draftCommand(
  options: SendEmailOptions & OutputOptions & { html?: boolean }
): Promise<void> {
  const { to, subject, body } = options;

  // Validate inputs
  const validation = validateDraftInput({ to, subject, body, cc: options.cc, bcc: options.bcc });
  if (!validation.valid) {
    errorOutput('Validation failed:\n' + validation.errors.join('\n'));
    process.exit(1);
  }

  try {
    const gmail = await getGmailClient();

    const raw = createRawEmail(options);

    const response = await withRetry(() =>
      gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw,
          },
        },
      })
    );

    output(
      {
        success: true,
        draftId: response.data.id,
        messageId: response.data.message?.id,
        threadId: response.data.message?.threadId,
        note: 'Draft created. Open Gmail to review and send manually.',
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
