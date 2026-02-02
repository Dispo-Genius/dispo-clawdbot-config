import { Command } from 'commander';
import { createClient } from '../api/client';
import { output } from '../utils/output';

export const replyTicket = new Command('reply-ticket')
  .description('Send a reply to a ticket')
  .argument('<id>', 'Ticket/conversation ID')
  .argument('<message>', 'Reply message text')
  .option('--internal', 'Mark as internal note (not visible to customer)')
  .action(async (id, message, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      const payload: Record<string, unknown> = {
        text: message,
        type: 'ADMIN',
      };

      if (opts.internal) {
        payload.internal = true;
      }

      const response = await client.post(`/conversations/${id}/messages`, payload);

      output({
        success: true,
        summary: `reply:sent | Ticket: ${id} | ${opts.internal ? '(internal note)' : '(visible to customer)'}`,
        data: response.data
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
