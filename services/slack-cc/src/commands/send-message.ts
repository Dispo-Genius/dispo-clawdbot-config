import { Command } from 'commander';
import { slackClient, normalizeChannelName, getChannelId, getAvailableChannels, getUserId } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { resolveUserMentions } from '../utils/mentions';
import { markdownToMrkdwn } from '../utils/formatting';
import { output, formatSendResult, errorOutput } from '../utils/output';

export const sendMessage = new Command('send-message')
  .description('Send a message to a Slack channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<message>', 'Message text (supports Slack markdown and @mentions)')
  .option('--thread <ts>', 'Thread timestamp to reply to')
  .option('--mention <names>', 'Comma-separated names to @mention at start of message')
  .action(async (channel: string, message: string, options: { thread?: string; mention?: string }) => {
    try {
      // Auto-sync if cache missing or stale (>24h)
      const cache = await ensureFreshCache();

      // DM channel IDs (D...) bypass channel allowlist — they're already gated
      // by the DM recipient allowlist when the initial DM was sent
      const isDmChannel = /^D[A-Z0-9]+$/.test(channel);

      if (!isDmChannel) {
        // Check allowlist first
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

      // Build final message with mentions
      let finalMessage = message;

      // Handle --mention flag: prepend explicit mentions
      if (options.mention) {
        const names = options.mention.split(',').map((n) => n.trim());
        const mentionTags: string[] = [];

        for (const name of names) {
          const userId = getUserId(cache, name);
          if (userId) {
            mentionTags.push(`<@${userId}>`);
          }
        }

        if (mentionTags.length > 0) {
          finalMessage = `${mentionTags.join(' ')} ${finalMessage}`;
        }
      }

      // Resolve @name patterns in message body
      finalMessage = resolveUserMentions(finalMessage, cache);
      finalMessage = markdownToMrkdwn(finalMessage);

      const result = await slackClient.chat.postMessage({
        channel: channelId,
        text: finalMessage,
        thread_ts: options.thread,
        unfurl_links: true,
        unfurl_media: true,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to send message');
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
