import { Command } from 'commander';
import { getStripe, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const listSubscriptions = new Command('list-subscriptions')
  .description('List subscriptions')
  .option('-l, --limit <n>', 'Number of subscriptions to fetch', '10')
  .option('-c, --customer <id>', 'Filter by customer ID')
  .option('-s, --status <status>', 'Filter by status (active, past_due, canceled, etc.)')
  .option('--starting-after <id>', 'Cursor for pagination')
  .action(async (opts) => {
    try {
      const stripe = getStripe();
      const params: Record<string, unknown> = {
        limit: parseInt(opts.limit, 10),
      };
      if (opts.customer) params.customer = opts.customer;
      if (opts.status) params.status = opts.status;
      if (opts.startingAfter) params.starting_after = opts.startingAfter;

      const subs = await stripe.subscriptions.list(params);

      const data = subs.data.map((sub) => ({
        id: sub.id,
        customer: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString().slice(0, 10),
        items: sub.items.data.length,
        cancel_at_period_end: sub.cancel_at_period_end,
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
