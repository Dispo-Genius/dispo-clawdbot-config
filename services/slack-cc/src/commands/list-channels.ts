import { Command } from 'commander';
import { loadCacheWithWarning } from '../config/cache';
import { output, formatChannelList, errorOutput } from '../utils/output';

export const listChannels = new Command('list-channels')
  .description('List available Slack channels')
  .option('--filter <term>', 'Filter channels by name substring')
  .option('--limit <n>', 'Maximum number of results', '50')
  .action(async (options: { filter?: string; limit: string }) => {
    try {
      const cache = loadCacheWithWarning();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first to fetch channels and members.');
        return;
      }

      let channels = Object.values(cache.channels);

      // Apply filter if provided
      if (options.filter) {
        const filterLower = options.filter.toLowerCase();
        channels = channels.filter((c) => c.name.toLowerCase().includes(filterLower));
      }

      // Apply limit
      const limit = parseInt(options.limit, 10) || 50;
      channels = channels.slice(0, limit);

      // Format response
      const formattedChannels = channels.map((c) => ({
        name: c.name,
        id: c.id,
        isPrivate: c.isPrivate,
      }));

      output(formatChannelList(formattedChannels));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
