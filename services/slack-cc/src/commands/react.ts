import { Command } from 'commander';
import { slackClient, getChannelId, getAvailableChannels } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const react = new Command('react')
  .description('Add a reaction emoji to a message')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<timestamp>', 'Message timestamp (ts) to react to')
  .argument('<emoji>', 'Emoji name without colons (e.g. thumbsup, rocket)')
  .action(async (channel: string, timestamp: string, emoji: string) => {
    try {
      const cache = await ensureFreshCache();

      const isDmChannel = /^D[A-Z0-9]+$/.test(channel);

      if (!isDmChannel) {
        if (!isChannelAllowed(channel)) {
          errorOutput(`Channel "${channel}" is not in the allowlist. Allowed channels: ${getAllowedChannelsList()}`);
          return;
        }
      }

      const channelId = isDmChannel ? channel : getChannelId(cache, channel);
      if (!channelId) {
        const available = getAvailableChannels(cache);
        errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
        return;
      }

      // Strip colons if provided (e.g. :thumbsup: -> thumbsup)
      const cleanEmoji = emoji.replace(/^:/, '').replace(/:$/, '');

      const result = await slackClient.reactions.add({
        channel: channelId,
        timestamp,
        name: cleanEmoji,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to add reaction');
      }

      output(formatSuccess({ action: 'react', channel, timestamp, emoji: cleanEmoji }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
