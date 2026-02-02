import { Command } from 'commander';
import { getStripe, isLiveMode, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const charge = new Command('charge')
  .description('Create a charge (requires payment method on customer)')
  .requiredOption('-c, --customer <id>', 'Customer ID')
  .requiredOption('-a, --amount <cents>', 'Amount in cents')
  .option('--currency <code>', 'Currency code', 'usd')
  .option('-d, --description <desc>', 'Charge description')
  .option('--metadata <json>', 'JSON metadata object')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        const amount = formatAmount(parseInt(opts.amount, 10), opts.currency);
        error(`Live mode detected. You are about to charge ${amount} to customer ${opts.customer}. Re-run with --live-mode-confirmed to execute.`, 3);
      }

      const stripe = getStripe();

      // Create PaymentIntent (modern approach)
      const params: Record<string, unknown> = {
        customer: opts.customer,
        amount: parseInt(opts.amount, 10),
        currency: opts.currency,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      };

      if (opts.description) params.description = opts.description;
      if (opts.metadata) params.metadata = JSON.parse(opts.metadata);

      const pi = await stripe.paymentIntents.create(params);

      const amountDisplay = formatAmount(pi.amount, pi.currency);
      auditLog('charge', { customer: opts.customer, amount: opts.amount, currency: opts.currency }, 'success', `${pi.id} - ${amountDisplay}`);

      output({
        id: pi.id,
        customer: opts.customer,
        amount: amountDisplay,
        status: pi.status,
        created: new Date(pi.created * 1000).toISOString(),
      });
    } catch (err) {
      auditLog('charge', { customer: opts.customer, amount: opts.amount }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
