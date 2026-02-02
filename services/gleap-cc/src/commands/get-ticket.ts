import { Command } from 'commander';
import { createClient } from '../api/client';
import { output, formatMessageSummary } from '../utils/output';
import { GleapConversation, GleapMessage } from '../types';

export const getTicket = new Command('get-ticket')
  .description('Get ticket details with conversation history')
  .argument('<id>', 'Ticket/conversation ID')
  .option('--messages', 'Include full message history', true)
  .action(async (id, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      const response = await client.get(`/conversations/${id}`);
      const ticket: GleapConversation = response.data;

      if (!ticket) {
        output({
          success: false,
          error: `Ticket ${id} not found`
        });
        return;
      }

      // Get messages if requested
      let messages: GleapMessage[] = [];
      if (opts.messages) {
        const msgResponse = await client.get(`/conversations/${id}/messages`);
        messages = msgResponse.data?.data || [];
      }

      const sender = ticket.sender?.name || ticket.sender?.email || 'Unknown';
      const assignee = ticket.assignedTo?.name || 'Unassigned';
      const tags = ticket.tags?.join(', ') || 'none';

      let summary = `Ticket: ${id}
Status: ${ticket.status} | Priority: ${ticket.priority || 'MEDIUM'}
From: ${sender} | Assigned: ${assignee}
Tags: ${tags}
Created: ${new Date(ticket.createdAt).toLocaleString()}
Updated: ${new Date(ticket.updatedAt).toLocaleString()}`;

      if (messages.length > 0) {
        const msgSummaries = messages.map(m => formatMessageSummary({
          id: m.id,
          type: m.type,
          text: m.text,
          createdAt: m.createdAt,
          sender: m.sender
        }));
        summary += `\n\n--- Messages (${messages.length}) ---\n${msgSummaries.join('\n')}`;
      }

      output({
        success: true,
        summary,
        data: { ...ticket, messages }
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
