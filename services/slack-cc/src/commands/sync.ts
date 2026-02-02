import { Command } from 'commander';
import { slackClient, normalizeChannelName, normalizeUserName } from '../api/client';
import { saveCache, getCacheFilePath } from '../config/cache';
import type { SlackCache, ChannelInfo, MemberInfo } from '../types';

export const sync = new Command('sync')
  .description('Sync workspace channels and members from Slack API')
  .action(async () => {
    try {
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

      // Output success
      console.log(
        JSON.stringify({
          success: true,
          message: `Synced ${Object.keys(channels).length} channels, ${Object.keys(members).length} members`,
          channelCount: Object.keys(channels).length,
          memberCount: Object.keys(members).length,
          cacheFile: getCacheFilePath(),
          workspace: workspaceName,
        })
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
      process.exit(1);
    }
  });
