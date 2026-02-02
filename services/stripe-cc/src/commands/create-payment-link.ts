import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const createPaymentLink = new Command('create-payment-link')
  .description('Create a payment link')
  .requiredOption('-p, --price <id>', 'Price ID')
  .option('-q, --quantity <n>', 'Quantity', '1')
  .option('--adjustable-quantity', 'Allow customer to adjust quantity')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      const lineItem: Record<string, unknown> = {
        price: opts.price,
        quantity: parseInt(opts.quantity, 10),
      };

      if (opts.adjustableQuantity) {
        lineItem.adjustable_quantity = { enabled: true };
      }

      const link = await stripe.paymentLinks.create({
        line_items: [lineItem],
      });

      auditLog('create-payment-link', { price: opts.price }, 'success', link.id);

      output({
        id: link.id,
        url: link.url,
        active: link.active,
        created: new Date(link.created * 1000).toISOString(),
      });
    } catch (err) {
      auditLog('create-payment-link', { price: opts.price }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
