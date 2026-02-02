import { Command } from 'commander';
import { createClient } from '../api/client';
import { output } from '../utils/output';

export const updateTicket = new Command('update-ticket')
  .description('Update ticket properties')
  .argument('<id>', 'Ticket/conversation ID')
  .option('-s, --status <status>', 'Set status: OPEN, INPROGRESS, CLOSED')
  .option('-p, --priority <priority>', 'Set priority: LOW, MEDIUM, HIGH, URGENT')
  .option('-a, --assignee <id>', 'Assign to user ID')
  .option('-t, --tag <tags...>', 'Set tags (replaces existing)')
  .option('--add-tag <tag>', 'Add a single tag')
  .action(async (id, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      const payload: Record<string, unknown> = {};

      if (opts.status) payload.status = opts.status.toUpperCase();
      if (opts.priority) payload.priority = opts.priority.toUpperCase();
      if (opts.assignee) payload.assignedTo = opts.assignee;
      if (opts.tag) payload.tags = opts.tag;

      // If adding a single tag, fetch existing first
      if (opts.addTag) {
        const existing = await client.get(`/conversations/${id}`);
        const existingTags = existing.data?.tags || [];
        payload.tags = [...existingTags, opts.addTag];
      }

      if (Object.keys(payload).length === 0) {
        output({
          success: false,
          error: 'No update options provided. Use --help for options.'
        });
        return;
      }

      const response = await client.patch(`/conversations/${id}`, payload);

      const changes = Object.entries(payload)
        .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
        .join(', ');

      output({
        success: true,
        summary: `update:complete | Ticket: ${id} | ${changes}`,
        data: response.data
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
