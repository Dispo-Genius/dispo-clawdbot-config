import { getAgentMailClient } from '../api/client.js';
import { formatInboxList, formatInbox, formatMutationResult, errorOutput, type OutputOptions } from '../utils/output.js';

export async function inboxCreateCommand(options: { displayName?: string } & OutputOptions): Promise<void> {
  try {
    const client = getAgentMailClient();

    const createOptions: { displayName?: string } = {};
    if (options.displayName) {
      createOptions.displayName = options.displayName;
    }

    const inbox = await client.inboxes.create(createOptions);

    console.log(formatMutationResult('inbox_created', {
      inboxId: inbox.inboxId,
      displayName: inbox.displayName,
    }, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

export async function inboxListCommand(options: OutputOptions = {}): Promise<void> {
  try {
    const client = getAgentMailClient();
    const response = await client.inboxes.list();

    const inboxes = response.inboxes || [];
    console.log(formatInboxList(inboxes, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

export async function inboxGetCommand(inboxId: string, options: OutputOptions = {}): Promise<void> {
  if (!inboxId) {
    errorOutput('Inbox ID is required');
  }

  try {
    const client = getAgentMailClient();
    const inbox = await client.inboxes.get(inboxId);

    console.log(formatInbox(inbox as unknown as Record<string, unknown>, options));
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
