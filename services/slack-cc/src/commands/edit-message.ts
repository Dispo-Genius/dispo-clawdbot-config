import { Command } from 'commander';
import { slackClient, normalizeChannelName, getChannelId, getAvailableChannels } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { resolveUserMentions } from '../utils/mentions';
import { markdownToMrkdwn } from '../utils/formatting';
import { output, formatSendResult, errorOutput } from '../utils/output';

export const editMessage = new Command('edit-message')
  .description('Edit an existing message in a Slack channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<timestamp>', 'Message timestamp (ts) to edit')
  .argument('<message>', 'New message text')
  .action(async (channel: string, timestamp: string, message: string) => {
    try {
      const cache = await ensureFreshCache();

      // Check allowlist first
      if (!isChannelAllowed(channel)) {
        errorOutput(`Channel "${channel}" is not in the allowlist. Allowed channels: ${getAllowedChannelsList()}`);
        return;
      }

      const channelId = getChannelId(cache, channel);
      if (!channelId) {
        const available = getAvailableChannels(cache);
        errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
        return;
      }

      // Resolve @name patterns in message body and convert Markdown to mrkdwn
      const finalMessage = markdownToMrkdwn(resolveUserMentions(message, cache));

      const result = await slackClient.chat.update({
        channel: channelId,
        ts: timestamp,
        text: finalMessage,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to edit message');
      }

      const normalizedChannel = normalizeChannelName(channel);
      const permalink = `https://slack.com/archives/${channelId}/p${result.ts?.replace('.', '')}`;

      output(formatSendResult({
        channel: normalizedChannel,
        channelId,
        messageTs: result.ts,
        permalink,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
