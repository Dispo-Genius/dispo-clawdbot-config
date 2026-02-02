import { Command } from 'commander';
import { createClient } from '../api/client';
import { output, formatTicketSummary } from '../utils/output';
import { GleapConversation } from '../types';

export const listTickets = new Command('list-tickets')
  .description('List tickets with optional filters')
  .option('-s, --status <status>', 'Filter by status: OPEN, INPROGRESS, CLOSED')
  .option('-p, --priority <priority>', 'Filter by priority: LOW, MEDIUM, HIGH, URGENT')
  .option('-l, --limit <number>', 'Max results (default: 25)', '25')
  .option('--skip <number>', 'Skip results for pagination', '0')
  .option('--sort <field>', 'Sort field: -createdAt, createdAt, -priority', '-createdAt')
  .option('-a, --assignee <id>', 'Filter by assignee ID')
  .option('--search <query>', 'Search tickets')
  .action(async (opts) => {
    const client = createClient();
    if (!client) return;

    try {
      const params: Record<string, string | number> = {
        type: 'ticket',
        limit: parseInt(opts.limit),
        skip: parseInt(opts.skip),
        sort: opts.sort,
      };

      if (opts.status) params.status = opts.status.toUpperCase();
      if (opts.priority) params.priority = opts.priority.toUpperCase();
      if (opts.assignee) params.assignedTo = opts.assignee;
      if (opts.search) params.search = opts.search;

      const response = await client.get('/conversations', { params });
      const tickets: GleapConversation[] = response.data?.data || [];

      if (tickets.length === 0) {
        output({
          success: true,
          summary: 'No tickets found',
          data: []
        });
        return;
      }

      const summaries = tickets.map(t => formatTicketSummary({
        id: t.id,
        status: t.status,
        priority: t.priority,
        title: t.title,
        sender: t.sender,
        createdAt: t.createdAt
      }));

      output({
        success: true,
        summary: `${tickets.length} tickets:\n${summaries.join('\n')}`,
        data: tickets
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
