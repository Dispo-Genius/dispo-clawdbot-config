import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const updateCustomer = new Command('update-customer')
  .description('Update a customer')
  .argument('<id>', 'Customer ID')
  .option('-e, --email <email>', 'New email')
  .option('-n, --name <name>', 'New name')
  .option('-p, --phone <phone>', 'New phone')
  .option('-d, --description <desc>', 'New description')
  .option('--metadata <json>', 'JSON metadata object')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (id: string, opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      const params: Record<string, unknown> = {};
      if (opts.email) params.email = opts.email;
      if (opts.name) params.name = opts.name;
      if (opts.phone) params.phone = opts.phone;
      if (opts.description) params.description = opts.description;
      if (opts.metadata) params.metadata = JSON.parse(opts.metadata);

      if (Object.keys(params).length === 0) {
        error('No update fields provided');
      }

      const customer = await stripe.customers.update(id, params);

      auditLog('update-customer', { id, ...params }, 'success', customer.id);

      output({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        updated: true,
      });
    } catch (err) {
      auditLog('update-customer', { id }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
