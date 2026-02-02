import { Command } from 'commander';
import { slackClient, getChannelId, getAvailableChannels } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const pin = new Command('pin')
  .description('Pin a message in a channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<timestamp>', 'Message timestamp (ts) to pin')
  .action(async (channel: string, timestamp: string) => {
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

      const result = await slackClient.pins.add({
        channel: channelId,
        timestamp,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to pin message');
      }

      output(formatSuccess({ action: 'pin', channel, timestamp }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
