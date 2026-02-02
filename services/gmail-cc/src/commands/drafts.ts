import { getGmailClient } from '../api/client.js';
import { withRetry } from '../utils/retry.js';
import { output, errorOutput, type OutputOptions } from '../utils/output.js';
import type { EmailHeader } from '../types.js';

function getHeader(headers: EmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

export async function listDraftsCommand(options: { limit?: number } & OutputOptions): Promise<void> {
  const limit = options.limit || 10;

  try {
    const gmail = await getGmailClient();

    const response = await withRetry(() =>
      gmail.users.drafts.list({
        userId: 'me',
        maxResults: limit,
      })
    );

    const drafts = response.data.drafts || [];

    if (drafts.length === 0) {
      output({ drafts: [], count: 0 }, options);
      return;
    }

    // Fetch details for each draft
    const draftDetails = await Promise.all(
      drafts.map(async (draft) => {
        if (!draft.id) return null;

        const detail = await withRetry(() =>
          gmail.users.drafts.get({
            userId: 'me',
            id: draft.id!,
            format: 'metadata',
          })
        );

        const headers = detail.data.message?.payload?.headers as EmailHeader[] | undefined;

        return {
          draftId: draft.id,
          messageId: detail.data.message?.id,
          to: getHeader(headers, 'To'),
          subject: getHeader(headers, 'Subject'),
          date: getHeader(headers, 'Date'),
          snippet: detail.data.message?.snippet || '',
        };
      })
    );

    const validDrafts = draftDetails.filter(Boolean);

    output({ drafts: validDrafts, count: validDrafts.length }, options);
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
    process.exit(1);
  }
}

export async function deleteDraftCommand(
  draftId: string,
  options: OutputOptions
): Promise<void> {
  if (!draftId) {
    errorOutput('Draft ID is required');
    process.exit(1);
  }

  try {
    const gmail = await getGmailClient();

    await withRetry(() =>
      gmail.users.drafts.delete({
        userId: 'me',
        id: draftId,
      })
    );

    output({ success: true, deleted: draftId }, options);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        errorOutput(`Draft not found: ${draftId}`);
      } else {
        errorOutput(error.message, error);
      }
    } else {
      errorOutput('Unknown error occurred');
    }
    process.exit(1);
  }
}
