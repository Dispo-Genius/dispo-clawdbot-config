import { Command } from 'commander';
import { getStripe } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const searchCustomers = new Command('search-customers')
  .description('Search customers using Stripe Query Language')
  .requiredOption('-q, --query <query>', 'Search query (e.g., name~"john")')
  .option('-l, --limit <n>', 'Results per page (1-100)', '10')
  .option('-p, --page <cursor>', 'Pagination cursor')
  .action(async (opts) => {
    try {
      const stripe = getStripe();
      const params: { query: string; limit?: number; page?: string } = {
        query: opts.query,
        limit: parseInt(opts.limit, 10),
      };
      if (opts.page) params.page = opts.page;

      const result = await stripe.customers.search(params);

      const data = result.data.map((c) => ({
        id: c.id,
        email: c.email ?? '',
        name: c.name ?? '',
        created: new Date(c.created * 1000).toISOString().slice(0, 10),
        balance: c.balance,
      }));

      output(data);

      if (result.has_more && result.next_page) {
        console.error(`\nMore results available. Use --page "${result.next_page}"`);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
