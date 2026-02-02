import { Command } from 'commander';
import { slackClient, getChannelId, getAvailableChannels } from '../api/client';
import { loadCacheWithWarning } from '../config/cache';
import { output, formatMessageList, errorOutput } from '../utils/output';

interface SlackMessage {
  type: string;
  user?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
}

export const getHistory = new Command('get-history')
  .description('Get message history from a Slack channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .option('--limit <n>', 'Number of messages to fetch', '20')
  .option('--user <id>', 'Filter messages by user ID')
  .action(async (channel: string, options: { limit: string; user?: string }) => {
    try {
      const cache = loadCacheWithWarning();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first to fetch channels and members.');
        return;
      }

      const channelId = getChannelId(cache, channel);
      if (!channelId) {
        const available = getAvailableChannels(cache);
        errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
        return;
      }

      const result = await slackClient.conversations.history({
        channel: channelId,
        limit: parseInt(options.limit, 10),
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch history');
      }

      let messages = (result.messages || []) as SlackMessage[];

      // Filter by user if specified
      if (options.user) {
        messages = messages.filter((m) => m.user === options.user);
      }

      // Build user map for display names
      const userMap: Record<string, string> = {};
      for (const [name, member] of Object.entries(cache.members)) {
        userMap[member.id] = member.displayName || member.realName || name;
      }

      const formattedMessages = messages.map((m) => ({
        user: m.user ? userMap[m.user] || m.user : 'unknown',
        userId: m.user,
        text: m.text,
        ts: m.ts,
        isThreadReply: !!m.thread_ts && m.thread_ts !== m.ts,
      }));

      output(formatMessageList(channel, channelId, formattedMessages));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
