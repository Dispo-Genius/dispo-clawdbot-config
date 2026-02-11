import { Command } from 'commander';
import { getStripe, isLiveMode, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const addInvoiceItem = new Command('add-invoice-item')
  .description('Add a line item to a draft invoice')
  .requiredOption('-i, --invoice <id>', 'Invoice ID (must be draft)')
  .requiredOption('-a, --amount <cents>', 'Amount in cents (e.g., 5000 for $50.00)')
  .requiredOption('-d, --description <desc>', 'Line item description')
  .option('-c, --currency <code>', 'Currency code', 'usd')
  .option('-q, --quantity <n>', 'Quantity (default 1)', '1')
  .option('--metadata <json>', 'JSON metadata object')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      // Verify invoice exists and is draft
      const invoice = await stripe.invoices.retrieve(opts.invoice);
      if (invoice.status !== 'draft') {
        error(`Invoice ${opts.invoice} is not a draft (status: ${invoice.status}). Cannot add items.`, 2);
      }

      // Get customer from invoice
      const customer = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

      if (!customer) {
        error('Could not determine customer from invoice', 2);
      }

      const item = await stripe.invoiceItems.create({
        customer: customer!,
        invoice: opts.invoice,
        amount: parseInt(opts.amount, 10),
        currency: opts.currency,
        description: opts.description,
        ...(opts.metadata && { metadata: JSON.parse(opts.metadata) }),
      });

      auditLog('add-invoice-item', { invoice: opts.invoice, amount: opts.amount }, 'success', item.id);

      output({
        id: item.id,
        invoice: opts.invoice,
        amount: formatAmount(item.amount, item.currency),
        description: item.description,
        quantity: item.quantity,
      });
    } catch (err) {
      auditLog('add-invoice-item', { invoice: opts.invoice }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
