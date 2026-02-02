import { Command } from 'commander';
import { getItem } from '../utils/op.js';
import { formatCredential, errorOutput, output } from '../utils/output.js';

export const getCommand = new Command('get')
  .description('Get credential by name')
  .argument('<name>', 'Item name (e.g., github)')
  .action((name: string) => {
    const result = getItem(name);

    if (!result.success) {
      errorOutput(result.error ?? 'Unknown error');
    }

    try {
      const item = JSON.parse(result.data!);

      // Extract username and password from fields
      const usernameField = item.fields?.find(
        (f: { id?: string; label?: string }) => f.id === 'username' || f.label === 'username'
      );
      const passwordField = item.fields?.find(
        (f: { id?: string; label?: string }) => f.id === 'password' || f.label === 'password'
      );

      const username = usernameField?.value ?? '';
      const password = passwordField?.value ?? '';

      output(formatCredential(name, username, password));
    } catch {
      errorOutput('Failed to parse item data');
    }
  });
