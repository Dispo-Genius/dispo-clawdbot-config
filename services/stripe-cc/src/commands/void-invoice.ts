import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const voidInvoice = new Command('void-invoice')
  .description('Void an invoice')
  .argument('<id>', 'Invoice ID')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (id: string, opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      const invoice = await stripe.invoices.voidInvoice(id);

      auditLog('void-invoice', { id }, 'success', invoice.id);

      output({
        id: invoice.id,
        status: invoice.status,
        voided: true,
      });
    } catch (err) {
      auditLog('void-invoice', { id }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
