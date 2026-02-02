import { Command } from 'commander';
import { slackClient, normalizeChannelName, getChannelId, getAvailableChannels } from '../api/client';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const deleteMessage = new Command('delete-message')
  .description('Delete a message from a Slack channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<timestamp>', 'Message timestamp (ts) to delete')
  .action(async (channel: string, timestamp: string) => {
    try {
      const cache = await ensureFreshCache();

      const channelId = getChannelId(cache, channel);
      if (!channelId) {
        const available = getAvailableChannels(cache);
        errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
        return;
      }

      const result = await slackClient.chat.delete({
        channel: channelId,
        ts: timestamp,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to delete message');
      }

      const normalizedChannel = normalizeChannelName(channel);

      output(formatSuccess({
        channel: normalizedChannel,
        channelId,
        deletedTs: timestamp,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
