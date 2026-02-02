import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const sendInvoice = new Command('send-invoice')
  .description('Finalize and send an invoice')
  .argument('<id>', 'Invoice ID')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (id: string, opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      // Finalize if draft
      let invoice = await stripe.invoices.retrieve(id);
      if (invoice.status === 'draft') {
        invoice = await stripe.invoices.finalizeInvoice(id);
      }

      // Send the invoice
      invoice = await stripe.invoices.sendInvoice(id);

      auditLog('send-invoice', { id }, 'success', `sent to ${invoice.customer_email ?? 'customer'}`);

      output({
        id: invoice.id,
        status: invoice.status,
        sent_to: invoice.customer_email,
        hosted_invoice_url: invoice.hosted_invoice_url,
      });
    } catch (err) {
      auditLog('send-invoice', { id }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
