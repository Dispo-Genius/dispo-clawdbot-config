import { Command } from 'commander';
import { slackClient, normalizeChannelName } from '../api/client';
import { performSync } from '../utils/auto-sync';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const createChannel = new Command('create-channel')
  .description('Create a new Slack channel')
  .argument('<name>', 'Channel name (without # prefix)')
  .option('--private', 'Create a private channel')
  .option('--description <text>', 'Channel description/purpose')
  .action(async (name: string, options: { private?: boolean; description?: string }) => {
    try {
      const channelName = normalizeChannelName(name);

      const result = await slackClient.conversations.create({
        name: channelName,
        is_private: options.private ?? false,
      });

      if (!result.ok || !result.channel) {
        throw new Error(result.error || 'Failed to create channel');
      }

      const channelId = result.channel.id;

      // Set description/purpose if provided
      if (options.description && channelId) {
        await slackClient.conversations.setPurpose({
          channel: channelId,
          purpose: options.description,
        });
      }

      // Refresh cache to include new channel
      await performSync();

      output(formatSuccess({
        channel: channelName,
        channelId,
        isPrivate: options.private ?? false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle common Slack API errors
      if (errorMessage.includes('name_taken')) {
        errorOutput(`Channel "${name}" already exists`);
      } else if (errorMessage.includes('invalid_name')) {
        errorOutput(`Invalid channel name "${name}". Use lowercase letters, numbers, hyphens, and underscores only.`);
      } else {
        errorOutput(errorMessage);
      }
    }
  });
