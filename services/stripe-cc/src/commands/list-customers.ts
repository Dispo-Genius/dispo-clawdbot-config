import { Command } from 'commander';
import { getStripe } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const listCustomers = new Command('list-customers')
  .description('List customers')
  .option('-l, --limit <n>', 'Number of customers to fetch', '10')
  .option('-e, --email <email>', 'Filter by email')
  .option('--starting-after <id>', 'Cursor for pagination')
  .action(async (opts) => {
    try {
      const stripe = getStripe();
      const params: Record<string, unknown> = {
        limit: parseInt(opts.limit, 10),
      };
      if (opts.email) params.email = opts.email;
      if (opts.startingAfter) params.starting_after = opts.startingAfter;

      const customers = await stripe.customers.list(params);

      const data = customers.data.map((c) => ({
        id: c.id,
        email: c.email ?? '',
        name: c.name ?? '',
        created: new Date(c.created * 1000).toISOString().slice(0, 10),
        balance: c.balance,
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
