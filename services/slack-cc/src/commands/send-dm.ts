import { Command } from 'commander';
import { slackClient, getUserId, getAvailableMembers } from '../api/client';
import { isDmRecipientAllowed, getAllowedDmRecipientsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { resolveUserMentions } from '../utils/mentions';
import { markdownToMrkdwn } from '../utils/formatting';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const sendDm = new Command('send-dm')
  .description('Send a direct message to a Slack user')
  .argument('<user>', 'User name (display name or real name, with or without @ prefix)')
  .argument('<message>', 'Message text (supports Slack markdown and @mentions)')
  .action(async (user: string, message: string) => {
    try {
      // Auto-sync if cache missing or stale (>24h)
      const cache = await ensureFreshCache();

      // Check allowlist first
      if (!isDmRecipientAllowed(user)) {
        errorOutput(`User "${user}" is not in the DM allowlist. Allowed recipients: ${getAllowedDmRecipientsList()}`);
        return;
      }

      const userId = getUserId(cache, user);
      if (!userId) {
        const available = getAvailableMembers(cache);
        errorOutput(`User "${user}" not found. Available members: ${available.join(', ')}...`);
        return;
      }

      // Open a DM channel with the user
      const conversationResult = await slackClient.conversations.open({
        users: userId,
      });

      if (!conversationResult.ok || !conversationResult.channel?.id) {
        throw new Error(conversationResult.error || 'Failed to open DM channel');
      }

      const dmChannelId = conversationResult.channel.id;

      // Resolve @name patterns in message and convert Markdown to mrkdwn
      const finalMessage = markdownToMrkdwn(resolveUserMentions(message, cache));

      // Send the message
      const result = await slackClient.chat.postMessage({
        channel: dmChannelId,
        text: finalMessage,
        unfurl_links: true,
        unfurl_media: true,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to send DM');
      }

      // Find the user info for the response
      const userInfo = Object.values(cache.members).find((m) => m.id === userId);
      const userName = userInfo?.displayName || userInfo?.realName || user;

      output(formatSuccess({
        user: userName,
        userId,
        channelId: dmChannelId,
        messageTs: result.ts,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
