import { Command } from 'commander';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { slackClient, getChannelId, getAvailableChannels, getUserId, getAvailableMembers } from '../api/client';
import { isDmRecipientAllowed, getAllowedDmRecipientsList } from '../config/allowlist';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const uploadFile = new Command('upload-file')
  .description('Upload a file to a Slack channel or user DM')
  .argument('[channel]', 'Channel name (required unless --user is specified)')
  .argument('[filepath]', 'Path to the file to upload')
  .option('--user <name>', 'Upload to user DM instead of channel')
  .option('--file <path>', 'Path to file (alternative to filepath argument)')
  .option('--thread <ts>', 'Thread timestamp to upload to')
  .option('--title <title>', 'Title for the file (defaults to filename)')
  .option('--comment <comment>', 'Initial comment to post with the file')
  .action(async (channel: string | undefined, filepath: string | undefined, options: { user?: string; file?: string; thread?: string; title?: string; comment?: string }) => {
    // Resolve filepath from argument or --file option
    const resolvedFilepath = filepath || options.file;
    if (!resolvedFilepath) {
      errorOutput('File path is required (provide as argument or --file option)');
      return;
    }
    try {
      const cache = await ensureFreshCache();

      let channelId: string;

      if (options.user) {
        // DM upload path
        if (!isDmRecipientAllowed(options.user)) {
          errorOutput(`User "${options.user}" not in DM allowlist. Allowed: ${getAllowedDmRecipientsList()}`);
          return;
        }

        const userId = getUserId(cache, options.user);
        if (!userId) {
          const available = getAvailableMembers(cache);
          errorOutput(`User "${options.user}" not found. Available: ${available.join(', ')}...`);
          return;
        }

        const conversation = await slackClient.conversations.open({ users: userId });
        if (!conversation.ok || !conversation.channel?.id) {
          throw new Error(conversation.error || 'Failed to open DM channel');
        }

        channelId = conversation.channel.id;
      } else {
        // Channel upload path
        if (!channel) {
          errorOutput('Either <channel> or --user is required');
          return;
        }

        const resolvedChannelId = getChannelId(cache, channel);
        if (!resolvedChannelId) {
          const available = getAvailableChannels(cache);
          errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
          return;
        }
        channelId = resolvedChannelId;
      }

      // Read file content
      const fileContent = readFileSync(resolvedFilepath);
      const filename = basename(resolvedFilepath);
      const title = options.title || filename;

      // Build upload args - conditionally spread thread_ts only if defined
      const baseArgs = {
        channel_id: channelId,
        file: fileContent,
        filename: filename,
        title: title,
        ...(options.comment && { initial_comment: options.comment }),
      };

      // Upload file using files.uploadV2
      const result = options.thread
        ? await slackClient.filesUploadV2({ ...baseArgs, thread_ts: options.thread })
        : await slackClient.filesUploadV2(baseArgs);

      if (!result.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      output(formatSuccess({
        ...(options.user ? { user: options.user } : { channel }),
        channelId,
        filename: filename,
        title: title,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
