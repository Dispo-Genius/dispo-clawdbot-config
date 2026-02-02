import { Command } from 'commander';
import { createClient } from '../api/client';
import { output } from '../utils/output';

export const createOutreach = new Command('create-outreach')
  .description('Send proactive outreach message to a user')
  .argument('<userId>', 'Target user ID')
  .argument('<message>', 'Message to send')
  .option('-t, --title <title>', 'Conversation title/subject')
  .option('--channel <channel>', 'Channel: email, widget, whatsapp', 'widget')
  .action(async (userId, message, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      // Create new conversation with the user
      const payload: Record<string, unknown> = {
        type: 'chat',
        senderId: userId,
        messages: [{
          text: message,
          type: 'ADMIN'
        }]
      };

      if (opts.title) {
        payload.title = opts.title;
      }

      const response = await client.post('/conversations', payload);
      const conversationId = response.data?.id;

      output({
        success: true,
        summary: `outreach:sent | User: ${userId} | Conversation: ${conversationId}`,
        data: response.data
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
