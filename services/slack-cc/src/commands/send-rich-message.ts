import { Command } from 'commander';
import { slackClient, normalizeChannelName, getChannelId, getAvailableChannels } from '../api/client';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, formatSendResult, errorOutput } from '../utils/output';
import type { KnownBlock, MessageAttachment } from '@slack/web-api';

interface RichMessageOptions {
  thread?: string;
  blocks?: string;
  attachments?: string;
}

export const sendRichMessage = new Command('send-rich-message')
  .description('Send a rich message with blocks or attachments to a Slack channel')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('[text]', 'Fallback text (shown in notifications)')
  .option('--thread <ts>', 'Thread timestamp to reply to')
  .option('--blocks <json>', 'JSON array of Slack Block Kit blocks')
  .option('--attachments <json>', 'JSON array of Slack attachments')
  .action(async (channel: string, text: string | undefined, options: RichMessageOptions) => {
    try {
      const cache = await ensureFreshCache();

      const channelId = getChannelId(cache, channel);
      if (!channelId) {
        const available = getAvailableChannels(cache);
        errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
        return;
      }

      // Require at least blocks or attachments
      if (!options.blocks && !options.attachments) {
        errorOutput('Must provide --blocks or --attachments (or both)');
        return;
      }

      // Parse blocks if provided
      let blocks: KnownBlock[] | undefined;
      if (options.blocks) {
        try {
          blocks = JSON.parse(options.blocks);
        } catch {
          errorOutput('Invalid JSON for --blocks');
          return;
        }
      }

      // Parse attachments if provided
      let attachments: MessageAttachment[] | undefined;
      if (options.attachments) {
        try {
          attachments = JSON.parse(options.attachments);
        } catch {
          errorOutput('Invalid JSON for --attachments');
          return;
        }
      }

      const result = await slackClient.chat.postMessage({
        channel: channelId,
        text: text || 'Rich message',
        blocks,
        attachments,
        thread_ts: options.thread,
        unfurl_links: false,
        unfurl_media: false,
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
