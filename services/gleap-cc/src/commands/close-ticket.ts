import { Command } from 'commander';
import { createClient } from '../api/client';
import { output } from '../utils/output';

export const closeTicket = new Command('close-ticket')
  .description('Close a ticket with optional resolution note')
  .argument('<id>', 'Ticket/conversation ID')
  .option('-n, --note <text>', 'Add resolution note before closing')
  .option('--internal', 'Make resolution note internal only')
  .action(async (id, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      // Add resolution note if provided
      if (opts.note) {
        await client.post(`/conversations/${id}/messages`, {
          text: `[Resolution] ${opts.note}`,
          type: 'ADMIN',
          internal: opts.internal || false
        });
      }

      // Close the ticket
      const response = await client.patch(`/conversations/${id}`, {
        status: 'CLOSED'
      });

      output({
        success: true,
        summary: `close:complete | Ticket: ${id}${opts.note ? ' | Note added' : ''}`,
        data: response.data
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
