import { WebClient } from '@slack/web-api';
import type { SlackCache } from '../types';

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.log(JSON.stringify({ success: false, error: 'SLACK_BOT_TOKEN environment variable not set' }));
  process.exit(1);
}

export const slackClient = new WebClient(BOT_TOKEN);

/**
 * Normalize channel name by removing # prefix and converting to lowercase
 */
export function normalizeChannelName(name: string): string {
  return name.replace(/^#/, '').toLowerCase().trim();
}

/**
 * Normalize user name by removing @ prefix and converting to lowercase
 */
export function normalizeUserName(name: string): string {
  return name.replace(/^@/, '').toLowerCase().trim();
}

/**
 * Resolve channel name to channel ID using cache
 * Supports exact match, case-insensitive match, and partial match
 */
export function getChannelId(cache: SlackCache, channelName: string): string | null {
  const normalized = normalizeChannelName(channelName);

  // Exact match (case-insensitive, already normalized in cache)
  if (cache.channels[normalized]) {
    return cache.channels[normalized].id;
  }

  // Partial match fallback
  const partialMatch = Object.entries(cache.channels).find(([key]) =>
    key.includes(normalized)
  );

  return partialMatch ? partialMatch[1].id : null;
}

/**
 * Resolve user name to user ID using cache
 * Checks display name first, then real name, then partial matches
 */
export function getUserId(cache: SlackCache, userName: string): string | null {
  const normalized = normalizeUserName(userName);

  // Check display name (exact match)
  if (cache.members[normalized]) {
    return cache.members[normalized].id;
  }

  // Check real name (case-insensitive)
  const realNameKey = Object.keys(cache.membersByRealName).find(
    (name) => name.toLowerCase() === normalized
  );
  if (realNameKey) {
    return cache.membersByRealName[realNameKey];
  }

  // Partial match on display name
  const partialDisplayMatch = Object.entries(cache.members).find(([key]) =>
    key.includes(normalized)
  );
  if (partialDisplayMatch) {
    return partialDisplayMatch[1].id;
  }

  // Partial match on real name
  const partialRealMatch = Object.values(cache.members).find((member) =>
    member.realName.toLowerCase().includes(normalized)
  );
  if (partialRealMatch) {
    return partialRealMatch.id;
  }

  return null;
}

/**
 * Get available channel names for error messages
 */
export function getAvailableChannels(cache: SlackCache, limit = 5): string[] {
  return Object.keys(cache.channels).slice(0, limit);
}

/**
 * Get available member names for error messages
 */
export function getAvailableMembers(cache: SlackCache, limit = 5): string[] {
  return Object.values(cache.members)
    .slice(0, limit)
    .map((m) => m.displayName || m.realName);
}
