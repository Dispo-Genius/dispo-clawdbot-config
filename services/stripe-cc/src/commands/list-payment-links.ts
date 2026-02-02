import { Command } from 'commander';
import { getStripe } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const listPaymentLinks = new Command('list-payment-links')
  .description('List payment links')
  .option('-l, --limit <n>', 'Number of payment links to fetch', '10')
  .option('-a, --active', 'Only show active links')
  .option('--starting-after <id>', 'Cursor for pagination')
  .action(async (opts) => {
    try {
      const stripe = getStripe();
      const params: Record<string, unknown> = {
        limit: parseInt(opts.limit, 10),
      };
      if (opts.active) params.active = true;
      if (opts.startingAfter) params.starting_after = opts.startingAfter;

      const links = await stripe.paymentLinks.list(params);

      const data = links.data.map((link) => ({
        id: link.id,
        active: link.active,
        url: link.url,
        created: new Date(link.created * 1000).toISOString().slice(0, 10),
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
