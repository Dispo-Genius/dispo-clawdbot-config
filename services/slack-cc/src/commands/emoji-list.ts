import { Command } from 'commander';
import { slackClient } from '../api/client';
import { output, errorOutput } from '../utils/output';

export const emojiList = new Command('emoji-list')
  .description('List custom workspace emoji')
  .option('--filter <term>', 'Filter emoji by name substring')
  .option('--limit <n>', 'Maximum number of results', '50')
  .action(async (options: { filter?: string; limit: string }) => {
    try {
      const result = await slackClient.emoji.list();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to list emoji');
      }

      const emojiMap = (result.emoji || {}) as Record<string, string>;
      let entries = Object.entries(emojiMap);

      if (options.filter) {
        const filterLower = options.filter.toLowerCase();
        entries = entries.filter(([name]) => name.toLowerCase().includes(filterLower));
      }

      const limit = parseInt(options.limit, 10) || 50;
      entries = entries.slice(0, limit);

      if (entries.length === 0) {
        output('emoji[0]{}:');
        return;
      }

      const header = `emoji[${entries.length}]{name|url}:`;
      const rows = entries.map(([name, url]) => {
        // Aliases start with "alias:"
        const display = url.startsWith('alias:') ? url : url.slice(0, 60);
        return `${name}|${display}`;
      });
      output([header, ...rows].join('\n'));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
