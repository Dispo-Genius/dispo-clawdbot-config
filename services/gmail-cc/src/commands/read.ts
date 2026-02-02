import { getGmailClient } from '../api/client.js';
import { withRetry } from '../utils/retry.js';
import { output, errorOutput, type OutputOptions } from '../utils/output.js';
import type { EmailDetail, EmailHeader, AttachmentInfo, GmailMessagePart } from '../types.js';

function getHeader(headers: EmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function decodeBase64(data: string): string {
  const decoded = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return decoded.toString('utf-8');
}

function extractBody(payload: GmailMessagePart | undefined): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }

    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64(part.body.data);
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '';
}

function extractAttachments(payload: GmailMessagePart | undefined): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = [];

  function processPart(part: GmailMessagePart): void {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }

    if (part.parts) {
      for (const nested of part.parts) {
        processPart(nested);
      }
    }
  }

  if (payload) {
    processPart(payload);
  }

  return attachments;
}

export async function readCommand(
  messageId: string,
  options: OutputOptions = {}
): Promise<void> {
  if (!messageId) {
    errorOutput('Message ID is required');
    process.exit(1);
  }

  try {
    const gmail = await getGmailClient();

    const response = await withRetry(() =>
      gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })
    );

    const message = response.data;
    const headers = message.payload?.headers as EmailHeader[] | undefined;

    const email: EmailDetail = {
      id: message.id || '',
      threadId: message.threadId || '',
      from: getHeader(headers, 'From'),
      to: getHeader(headers, 'To'),
      subject: getHeader(headers, 'Subject'),
      date: getHeader(headers, 'Date'),
      snippet: message.snippet || '',
      body: extractBody(message.payload),
      attachments: extractAttachments(message.payload),
    };

    output(email, options);
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
