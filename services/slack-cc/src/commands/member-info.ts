import { Command } from 'commander';
import { slackClient, getUserId } from '../api/client';
import { ensureFreshCache } from '../utils/auto-sync';
import { output, errorOutput } from '../utils/output';

export const memberInfo = new Command('member-info')
  .description('Get user profile info')
  .argument('<user>', 'User name or display name')
  .action(async (user: string) => {
    try {
      const cache = await ensureFreshCache();

      const userId = getUserId(cache, user);
      if (!userId) {
        errorOutput(`User "${user}" not found in cache. Try running sync first.`);
        return;
      }

      const result = await slackClient.users.info({
        user: userId,
      });

      if (!result.ok || !result.user) {
        throw new Error(result.error || 'Failed to get user info');
      }

      const profile = result.user.profile;
      const info = {
        id: result.user.id,
        name: result.user.name,
        realName: profile?.real_name || '-',
        displayName: profile?.display_name || '-',
        email: profile?.email || '-',
        title: profile?.title || '-',
        tz: result.user.tz || '-',
        isAdmin: result.user.is_admin || false,
        status: profile?.status_text || '-',
      };

      // TOON compact format
      const parts = Object.entries(info)
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      output(`member:${parts}`);
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
