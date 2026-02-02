import { Command } from 'commander';
import { loadCacheWithWarning } from '../config/cache';
import { output, formatMemberList, errorOutput } from '../utils/output';

export const listMembers = new Command('list-members')
  .description('List Slack workspace members')
  .option('--filter <term>', 'Filter members by name (display name or real name)')
  .option('--limit <n>', 'Maximum number of results', '100')
  .action(async (options: { filter?: string; limit: string }) => {
    try {
      const cache = loadCacheWithWarning();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first to fetch channels and members.');
        return;
      }

      let members = Object.values(cache.members);

      // Apply filter if provided
      if (options.filter) {
        const filterLower = options.filter.toLowerCase();
        members = members.filter(
          (m) =>
            m.displayName.toLowerCase().includes(filterLower) ||
            m.realName.toLowerCase().includes(filterLower)
        );
      }

      // Apply limit
      const limit = parseInt(options.limit, 10) || 100;
      members = members.slice(0, limit);

      // Format response
      const formattedMembers = members.map((m) => ({
        id: m.id,
        name: m.displayName || m.realName,
        displayName: m.displayName,
        realName: m.realName,
      }));

      output(formatMemberList(formattedMembers));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
