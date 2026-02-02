import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const createSubscription = new Command('create-subscription')
  .description('Create a new subscription')
  .requiredOption('-c, --customer <id>', 'Customer ID')
  .requiredOption('-p, --price <id>', 'Price ID')
  .option('-q, --quantity <n>', 'Quantity', '1')
  .option('--trial-days <n>', 'Trial period in days')
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
        customer: opts.customer,
        items: [{ price: opts.price, quantity: parseInt(opts.quantity, 10) }],
      };

      if (opts.trialDays) {
        params.trial_period_days = parseInt(opts.trialDays, 10);
      }
      if (opts.metadata) params.metadata = JSON.parse(opts.metadata);

      const sub = await stripe.subscriptions.create(params);

      auditLog('create-subscription', { customer: opts.customer, price: opts.price }, 'success', sub.id);

      output({
        id: sub.id,
        customer: opts.customer,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
    } catch (err) {
      auditLog('create-subscription', { customer: opts.customer, price: opts.price }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
