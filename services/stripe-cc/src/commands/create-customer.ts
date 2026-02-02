import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error, success } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const createCustomer = new Command('create-customer')
  .description('Create a new customer')
  .requiredOption('-e, --email <email>', 'Customer email')
  .option('-n, --name <name>', 'Customer name')
  .option('-p, --phone <phone>', 'Customer phone')
  .option('-d, --description <desc>', 'Description')
  .option('--metadata <json>', 'JSON metadata object')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      const params: Record<string, unknown> = {
        email: opts.email,
      };
      if (opts.name) params.name = opts.name;
      if (opts.phone) params.phone = opts.phone;
      if (opts.description) params.description = opts.description;
      if (opts.metadata) params.metadata = JSON.parse(opts.metadata);

      const customer = await stripe.customers.create(params);

      auditLog('create-customer', { email: opts.email, name: opts.name }, 'success', customer.id);

      output({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000).toISOString(),
      });
    } catch (err) {
      auditLog('create-customer', { email: opts.email }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
