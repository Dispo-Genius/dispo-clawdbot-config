import { Command } from 'commander';
import { getStripe, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const listPaymentIntents = new Command('list-payment-intents')
  .description('List payment intents')
  .option('-l, --limit <n>', 'Number of payment intents to fetch', '10')
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

      const pis = await stripe.paymentIntents.list(params);

      const data = pis.data.map((pi) => ({
        id: pi.id,
        customer: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? '',
        amount: formatAmount(pi.amount, pi.currency),
        status: pi.status,
        created: new Date(pi.created * 1000).toISOString().slice(0, 10),
        description: pi.description ?? '',
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
