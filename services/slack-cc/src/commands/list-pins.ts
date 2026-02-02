import { Command } from 'commander';
import { slackClient, getChannelId, getAvailableChannels } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, errorOutput } from '../utils/output';

export const listPins = new Command('list-pins')
  .description('List pinned items in a channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .action(async (channel: string) => {
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

      const result = await slackClient.pins.list({
        channel: channelId,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to list pins');
      }

      // The Slack API returns message objects in items, but the SDK types
      // are incomplete — cast to access the actual response shape
      const items = (result.items || []) as Array<{
        type?: string;
        message?: { ts?: string; user?: string; text?: string };
        created?: number;
        created_by?: string;
      }>;

      if (items.length === 0) {
        output('pins[0]{}:');
        return;
      }

      const formatted = items.map((item) => {
        const msg = item.message;
        const text = (msg?.text || '').replace(/\n/g, ' ').slice(0, 80);
        return {
          ts: msg?.ts || '-',
          user: msg?.user || item.created_by || '-',
          text: text || '-',
        };
      });

      const header = `pins[${formatted.length}]{ts|user|text}:`;
      const rows = formatted.map((p) => `${p.ts}|${p.user}|${p.text}`);
      output([header, ...rows].join('\n'));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
