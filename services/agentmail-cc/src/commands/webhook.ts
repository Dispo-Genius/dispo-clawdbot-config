import { getApiKey } from '../api/client.js';
import { formatOutput, formatMutationResult, errorOutput, type OutputOptions } from '../utils/output.js';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4100';
const AGENTMAIL_API_URL = 'https://api.agentmail.to/v0';

export interface WebhookRegisterOptions extends OutputOptions {
  inboxId: string;
  callbackUrl: string;
}

export interface WebhookListOptions extends OutputOptions {
  inboxId?: string;
}

export interface WebhookEventsOptions extends OutputOptions {
  since?: string;
  mailboxId?: string;
  limit?: number;
}

export interface WebhookDeleteOptions extends OutputOptions {
  webhookId: string;
}

async function agentmailFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('AGENTMAIL_KEY not found. Please add AGENTMAIL_KEY to ~/.claude/.env');
  }

  const response = await fetch(`${AGENTMAIL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

export async function webhookRegisterCommand(options: WebhookRegisterOptions): Promise<void> {
  if (!options.inboxId) {
    errorOutput('Inbox ID is required');
  }

  if (!options.callbackUrl) {
    errorOutput('Callback URL is required');
  }

  try {
    const response = await agentmailFetch('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: options.callbackUrl,
        event_types: ['message.received'],
        inbox_ids: [options.inboxId],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      errorOutput(`AgentMail API error: ${response.status} ${text}`);
    }

    const webhook = await response.json();

    console.log(formatMutationResult('webhook_registered', {
      webhookId: webhook.webhook_id,
      inboxId: options.inboxId,
      url: options.callbackUrl,
      secret: webhook.secret,
    }, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

export async function webhookListCommand(options: WebhookListOptions): Promise<void> {
  try {
    const response = await agentmailFetch('/webhooks');

    if (!response.ok) {
      const text = await response.text();
      errorOutput(`AgentMail API error: ${response.status} ${text}`);
    }

    const data = await response.json();

    // Filter by inbox if specified
    let webhooks = data.webhooks || [];
    if (options.inboxId) {
      webhooks = webhooks.filter((w: { inbox_ids?: string[] }) =>
        w.inbox_ids?.includes(options.inboxId!)
      );
    }

    console.log(formatOutput({ count: webhooks.length, webhooks }, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

export async function webhookEventsCommand(options: WebhookEventsOptions): Promise<void> {
  try {
    const url = new URL(`${GATEWAY_URL}/webhook/agentmail/events`);

    if (options.since) {
      // Parse relative time like "5m" or "1h" into ISO timestamp
      const timestamp = parseRelativeTime(options.since);
      url.searchParams.set('since', timestamp);
    }

    if (options.mailboxId) {
      url.searchParams.set('mailbox_id', options.mailboxId);
    }

    if (options.limit) {
      url.searchParams.set('limit', options.limit.toString());
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const text = await response.text();
      errorOutput(`Gateway error: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log(formatOutput(data, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

export async function webhookDeleteCommand(options: WebhookDeleteOptions): Promise<void> {
  if (!options.webhookId) {
    errorOutput('Webhook ID is required');
  }

  try {
    const response = await agentmailFetch(`/webhooks/${options.webhookId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const text = await response.text();
      errorOutput(`AgentMail API error: ${response.status} ${text}`);
    }

    console.log(formatMutationResult('webhook_deleted', {
      webhookId: options.webhookId,
    }, options));
  } catch (error) {
    if (error instanceof Error) {
      errorOutput(error.message, error);
    } else {
      errorOutput('Unknown error occurred');
    }
  }
}

function parseRelativeTime(input: string): string {
  // If already an ISO timestamp, return as-is
  if (input.includes('T') || input.includes('-')) {
    return input;
  }

  // Parse relative times like "5m", "1h", "2d"
  const match = input.match(/^(\d+)([mhd])$/);
  if (!match) {
    return input;
  }

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  const now = new Date();
  switch (unit) {
    case 'm':
      now.setMinutes(now.getMinutes() - value);
      break;
    case 'h':
      now.setHours(now.getHours() - value);
      break;
    case 'd':
      now.setDate(now.getDate() - value);
      break;
  }

  return now.toISOString();
}
