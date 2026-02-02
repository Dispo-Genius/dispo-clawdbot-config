import { Command } from 'commander';
import { listItems } from '../utils/op.js';
import { formatItemList, errorOutput, output } from '../utils/output.js';

interface OpItem {
  id: string;
  title: string;
  additional_information?: string;
  updated_at: string;
}

export const listCommand = new Command('list')
  .description('List all credentials')
  .action(() => {
    const result = listItems();

    if (!result.success) {
      errorOutput(result.error ?? 'Unknown error');
    }

    try {
      const items: OpItem[] = JSON.parse(result.data!);

      const formatted = items.map(item => ({
        name: item.title,
        username: item.additional_information ?? '',
        updated: item.updated_at?.split('T')[0] ?? '',
      }));

      output(formatItemList(formatted));
    } catch {
      errorOutput('Failed to parse items');
    }
  });
