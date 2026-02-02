import { Command } from 'commander';
import { setItem } from '../utils/op.js';
import { formatSuccess, errorOutput, output } from '../utils/output.js';

export const setCommand = new Command('set')
  .description('Store credential')
  .argument('<name>', 'Item name (e.g., github)')
  .argument('<username>', 'Username or email')
  .argument('<password>', 'Password')
  .action((name: string, username: string, password: string) => {
    const result = setItem(name, username, password);

    if (!result.success) {
      errorOutput(result.error ?? 'Unknown error');
    }

    output(formatSuccess('created', name));
  });
