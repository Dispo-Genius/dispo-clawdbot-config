import { Command } from 'commander';
import { getStripe, isLiveMode, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const refund = new Command('refund')
  .description('Refund a charge or payment intent')
  .requiredOption('-i, --payment-intent <id>', 'Payment intent ID to refund')
  .option('-a, --amount <cents>', 'Partial refund amount in cents (omit for full refund)')
  .option('-r, --reason <reason>', 'Reason: duplicate, fraudulent, requested_by_customer')
  .option('--metadata <json>', 'JSON metadata object')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (opts) => {
    try {
      // Get the payment intent first to show amount
      const stripe = getStripe();
      const pi = await stripe.paymentIntents.retrieve(opts.paymentIntent);
      const refundAmount = opts.amount ? parseInt(opts.amount, 10) : pi.amount;
      const amountDisplay = formatAmount(refundAmount, pi.currency);

      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error(`Live mode detected. You are about to refund ${amountDisplay} for payment ${opts.paymentIntent}. Re-run with --live-mode-confirmed to execute.`, 3);
      }

      const params: Record<string, unknown> = {
        payment_intent: opts.paymentIntent,
      };

      if (opts.amount) params.amount = parseInt(opts.amount, 10);
      if (opts.reason) params.reason = opts.reason;
      if (opts.metadata) params.metadata = JSON.parse(opts.metadata);

      const refundResult = await stripe.refunds.create(params);

      const refundedAmount = formatAmount(refundResult.amount, refundResult.currency);
      auditLog('refund', { paymentIntent: opts.paymentIntent, amount: opts.amount }, 'success', `${refundResult.id} - ${refundedAmount}`);

      output({
        id: refundResult.id,
        payment_intent: opts.paymentIntent,
        amount: refundedAmount,
        status: refundResult.status,
        reason: refundResult.reason,
        created: new Date(refundResult.created * 1000).toISOString(),
      });
    } catch (err) {
      auditLog('refund', { paymentIntent: opts.paymentIntent }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
