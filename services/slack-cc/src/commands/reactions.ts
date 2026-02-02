import { Command } from 'commander';
import { slackClient, getChannelId, getAvailableChannels } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, errorOutput } from '../utils/output';

export const reactions = new Command('reactions')
  .description('List reactions on a message')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<timestamp>', 'Message timestamp (ts)')
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

      const result = await slackClient.reactions.get({
        channel: channelId,
        timestamp,
        full: true,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to get reactions');
      }

      const reactionsList = result.message?.reactions || [];
      const formatted = reactionsList.map((r) => ({
        emoji: r.name,
        count: r.count,
        users: r.users?.join(',') || '',
      }));

      if (formatted.length === 0) {
        output('reactions[0]{}:');
        return;
      }

      const header = `reactions[${formatted.length}]{emoji|count|users}:`;
      const rows = formatted.map((r) => `${r.emoji}|${r.count}|${r.users}`);
      output([header, ...rows].join('\n'));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
