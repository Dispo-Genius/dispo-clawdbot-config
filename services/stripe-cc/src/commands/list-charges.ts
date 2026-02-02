import { Command } from 'commander';
import { getStripe, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const listCharges = new Command('list-charges')
  .description('List charges')
  .option('-l, --limit <n>', 'Number of charges to fetch', '10')
  .option('-c, --customer <id>', 'Filter by customer ID')
  .option('--starting-after <id>', 'Cursor for pagination')
  .action(async (opts) => {
    try {
      const stripe = getStripe();
      const params: Record<string, unknown> = {
        limit: parseInt(opts.limit, 10),
      };
      if (opts.customer) params.customer = opts.customer;
      if (opts.startingAfter) params.starting_after = opts.startingAfter;

      const charges = await stripe.charges.list(params);

      const data = charges.data.map((ch) => ({
        id: ch.id,
        customer: typeof ch.customer === 'string' ? ch.customer : ch.customer?.id ?? '',
        amount: formatAmount(ch.amount, ch.currency),
        status: ch.status,
        paid: ch.paid,
        refunded: ch.refunded,
        created: new Date(ch.created * 1000).toISOString().slice(0, 10),
        description: ch.description ?? '',
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
