import { Command } from 'commander';
import { deleteItem } from '../utils/op.js';
import { formatSuccess, errorOutput, output } from '../utils/output.js';

export const deleteCommand = new Command('delete')
  .description('Delete credential')
  .argument('<name>', 'Item name to delete')
  .option('--confirmed', 'Confirm deletion')
  .action((name: string, opts: { confirmed?: boolean }) => {
    if (!opts.confirmed) {
      console.log(JSON.stringify({
        confirmation_required: true,
        action: 'delete',
        target: name,
        message: `Delete credential "${name}"? Re-run with --confirmed to proceed.`
      }));
      process.exit(2);
    }

    const result = deleteItem(name);

    if (!result.success) {
      errorOutput(result.error ?? 'Unknown error');
    }

    output(formatSuccess('deleted', name));
  });
