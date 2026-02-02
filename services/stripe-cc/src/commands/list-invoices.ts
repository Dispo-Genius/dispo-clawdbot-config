import { Command } from 'commander';
import { getStripe, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const listInvoices = new Command('list-invoices')
  .description('List invoices')
  .option('-l, --limit <n>', 'Number of invoices to fetch', '10')
  .option('-c, --customer <id>', 'Filter by customer ID')
  .option('-s, --status <status>', 'Filter by status (draft, open, paid, uncollectible, void)')
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

      const invoices = await stripe.invoices.list(params);

      const data = invoices.data.map((inv) => ({
        id: inv.id,
        customer: typeof inv.customer === 'string' ? inv.customer : inv.customer?.id ?? '',
        status: inv.status,
        amount: formatAmount(inv.total, inv.currency),
        created: new Date(inv.created * 1000).toISOString().slice(0, 10),
        due: inv.due_date ? new Date(inv.due_date * 1000).toISOString().slice(0, 10) : '',
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
