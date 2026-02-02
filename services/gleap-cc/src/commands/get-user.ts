import { Command } from 'commander';
import { createClient } from '../api/client';
import { output, formatUserSummary } from '../utils/output';
import { GleapUser } from '../types';

export const getUser = new Command('get-user')
  .description('Get user profile and history')
  .argument('<id>', 'User ID')
  .option('--tickets', 'Include recent tickets from this user')
  .action(async (id, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      const response = await client.get(`/users/${id}`);
      const user: GleapUser = response.data;

      if (!user) {
        output({
          success: false,
          error: `User ${id} not found`
        });
        return;
      }

      let summary = formatUserSummary({
        id: user.id,
        name: user.name,
        email: user.email,
        lastActivity: user.lastActivity
      });

      if (user.phone) {
        summary += `\nPhone: ${user.phone}`;
      }

      if (user.value !== undefined) {
        summary += `\nValue: $${user.value}`;
      }

      // Fetch user's tickets if requested
      if (opts.tickets) {
        const ticketsRes = await client.get('/conversations', {
          params: {
            type: 'ticket',
            senderId: id,
            limit: 5,
            sort: '-createdAt'
          }
        });
        const tickets = ticketsRes.data?.data || [];

        if (tickets.length > 0) {
          summary += `\n\n--- Recent Tickets (${tickets.length}) ---`;
          tickets.forEach((t: { id: string; status: string; createdAt: string }) => {
            summary += `\n[${t.id}] ${t.status} | ${new Date(t.createdAt).toLocaleDateString()}`;
          });
        }
      }

      output({
        success: true,
        summary,
        data: user
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
