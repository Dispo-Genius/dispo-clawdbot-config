import { Command } from 'commander';
import { getStripe, isLiveMode, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const markPaid = new Command('mark-paid')
  .description('Mark an invoice as paid (for out-of-band payments)')
  .argument('<id>', 'Invoice ID')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (id: string, opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      const invoice = await stripe.invoices.pay(id, {
        paid_out_of_band: true,
      });

      const amountDisplay = formatAmount(invoice.total, invoice.currency);
      auditLog('mark-paid', { id }, 'success', `${invoice.id} - ${amountDisplay}`);

      output({
        id: invoice.id,
        status: invoice.status,
        amount: amountDisplay,
        paid: invoice.paid,
      });
    } catch (err) {
      auditLog('mark-paid', { id }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
