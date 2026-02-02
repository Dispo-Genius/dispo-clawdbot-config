import { Command } from 'commander';
import { slackClient, getChannelId, getAvailableChannels } from '../api/client';
import { isChannelAllowed, getAllowedChannelsList } from '../config/allowlist';
import { loadCacheWithWarning } from '../config/cache';
import { markdownToMrkdwn } from '../utils/formatting';
import { resolveUserMentions } from '../utils/mentions';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const scheduleMessage = new Command('schedule-message')
  .description('Schedule a message to be sent to a Slack channel at a future time')
  .argument('<channel>', 'Channel name (with or without # prefix)')
  .argument('<message>', 'Message text (supports Slack markdown)')
  .argument('<post_at>', 'Unix timestamp OR relative time (e.g., "tomorrow 7am", "in 2 hours")')
  .action(async (channel: string, message: string, postAtArg: string) => {
    try {
      const cache = loadCacheWithWarning();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first to fetch channels and members.');
        return;
      }

      // Check allowlist first
      if (!isChannelAllowed(channel)) {
        errorOutput(`Channel "${channel}" is not in the allowlist. Allowed channels: ${getAllowedChannelsList()}`);
        return;
      }

      const channelId = getChannelId(cache, channel);
      if (!channelId) {
        const available = getAvailableChannels(cache);
        errorOutput(`Channel "${channel}" not found. Available channels: ${available.join(', ')}...`);
        return;
      }

      // Parse post_at - either Unix timestamp or relative time
      let postAt: number;

      if (/^\d+$/.test(postAtArg)) {
        // It's a Unix timestamp
        postAt = parseInt(postAtArg, 10);
      } else {
        // Parse relative time expressions
        postAt = parseRelativeTime(postAtArg);
      }

      // Validate: must be in the future, max 120 days
      const now = Math.floor(Date.now() / 1000);
      const maxFuture = now + (120 * 24 * 60 * 60); // 120 days

      if (postAt <= now) {
        errorOutput(`Scheduled time must be in the future. Got: ${new Date(postAt * 1000).toISOString()}`);
        return;
      }

      if (postAt > maxFuture) {
        errorOutput('Cannot schedule more than 120 days in the future.');
        return;
      }

      // Resolve @name patterns and convert Markdown to mrkdwn
      const finalMessage = markdownToMrkdwn(resolveUserMentions(message, cache));

      const result = await slackClient.chat.scheduleMessage({
        channel: channelId,
        text: finalMessage,
        post_at: postAt,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to schedule message');
      }

      const scheduledTime = new Date(postAt * 1000);

      output(formatSuccess({
        channel,
        channelId,
        scheduledMessageId: result.scheduled_message_id,
        scheduledFor: scheduledTime.toISOString(),
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

/**
 * Parse relative time expressions like "tomorrow 7am", "in 2 hours"
 */
function parseRelativeTime(input: string): number {
  const now = new Date();
  const lowered = input.toLowerCase().trim();

  // "tomorrow Xam/pm" pattern
  const tomorrowMatch = lowered.match(/^tomorrow\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (tomorrowMatch) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let hours = parseInt(tomorrowMatch[1], 10);
    const minutes = tomorrowMatch[2] ? parseInt(tomorrowMatch[2], 10) : 0;
    const ampm = tomorrowMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    tomorrow.setHours(hours, minutes, 0, 0);
    return Math.floor(tomorrow.getTime() / 1000);
  }

  // "in X hours/minutes" pattern
  const inMatch = lowered.match(/^in\s+(\d+)\s+(hour|minute|min|hr)s?$/i);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2].toLowerCase();

    const future = new Date(now);
    if (unit.startsWith('hour') || unit === 'hr') {
      future.setHours(future.getHours() + amount);
    } else {
      future.setMinutes(future.getMinutes() + amount);
    }
    return Math.floor(future.getTime() / 1000);
  }

  // "today Xam/pm" pattern
  const todayMatch = lowered.match(/^today\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (todayMatch) {
    const today = new Date(now);

    let hours = parseInt(todayMatch[1], 10);
    const minutes = todayMatch[2] ? parseInt(todayMatch[2], 10) : 0;
    const ampm = todayMatch[3]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    today.setHours(hours, minutes, 0, 0);
    return Math.floor(today.getTime() / 1000);
  }

  throw new Error(
    `Could not parse time: "${input}". Use Unix timestamp or formats like "tomorrow 7am", "in 2 hours", "today 3pm"`
  );
}
