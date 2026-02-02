import { slackClient, normalizeChannelName, normalizeUserName } from '../api/client';
import { loadCache, saveCache, isCacheStale } from '../config/cache';
import type { SlackCache, ChannelInfo, MemberInfo } from '../types';

/**
 * Perform a sync operation and return the fresh cache.
 * This is the core sync logic, extracted for reuse.
 */
export async function performSync(): Promise<SlackCache> {
  // Fetch workspace info
  const authResult = await slackClient.auth.test();
  if (!authResult.ok) {
    throw new Error(authResult.error || 'Failed to authenticate with Slack');
  }

  const workspaceId = authResult.team_id as string;
  const workspaceName = authResult.team as string;

  // Fetch all public channels (paginated)
  const channels: Record<string, ChannelInfo> = {};
  let channelCursor: string | undefined;

  do {
    const channelsResult = await slackClient.conversations.list({
      types: 'public_channel',
      limit: 200,
      cursor: channelCursor,
    });

    if (!channelsResult.ok) {
      throw new Error(channelsResult.error || 'Failed to fetch channels');
    }

    for (const channel of channelsResult.channels || []) {
      if (channel.id && channel.name) {
        const normalized = normalizeChannelName(channel.name);
        channels[normalized] = {
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private || false,
        };
      }
    }

    channelCursor = channelsResult.response_metadata?.next_cursor;
  } while (channelCursor);

  // Fetch all workspace members (paginated)
  const members: Record<string, MemberInfo> = {};
  const membersByRealName: Record<string, string> = {};
  let memberCursor: string | undefined;

  do {
    const usersResult = await slackClient.users.list({
      limit: 200,
      cursor: memberCursor,
    });

    if (!usersResult.ok) {
      throw new Error(usersResult.error || 'Failed to fetch users');
    }

    for (const user of usersResult.members || []) {
      // Skip bots and deleted users
      if (user.deleted || user.is_bot) continue;

      if (user.id && user.profile) {
        const displayName = user.profile.display_name || user.name || '';
        const realName = user.profile.real_name || user.name || '';
        const normalized = normalizeUserName(displayName || realName);

        if (normalized) {
          members[normalized] = {
            id: user.id,
            displayName: displayName,
            realName: realName,
            email: user.profile.email,
          };

          // Also index by real name for lookup
          if (realName) {
            membersByRealName[realName] = user.id;
          }
        }
      }
    }

    memberCursor = usersResult.response_metadata?.next_cursor;
  } while (memberCursor);

  // Build cache object
  const cache: SlackCache = {
    lastSynced: new Date().toISOString(),
    workspace: {
      id: workspaceId,
      name: workspaceName,
    },
    channels,
    members,
    membersByRealName,
  };

  // Save to disk
  saveCache(cache);

  return cache;
}

/**
 * Ensure we have a fresh cache. Auto-syncs if cache is missing or stale (>24h).
 * Returns the cache (fresh or existing if still valid).
 */
export async function ensureFreshCache(): Promise<SlackCache> {
  const cache = loadCache();

  // No cache - must sync
  if (!cache) {
    console.error(JSON.stringify({ info: 'No cache found. Auto-syncing...' }));
    return performSync();
  }

  // Cache is stale - auto sync
  if (isCacheStale(cache)) {
    console.error(JSON.stringify({ info: 'Cache stale (>24h). Auto-syncing...' }));
    return performSync();
  }

  // Cache is fresh
  return cache;
}
