import { Command } from 'commander';
import { getStripe, isLiveMode, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const createInvoice = new Command('create-invoice')
  .description('Create a draft invoice')
  .requiredOption('-c, --customer <id>', 'Customer ID')
  .option('-d, --description <desc>', 'Invoice description')
  .option('--auto-advance', 'Auto-finalize and send the invoice')
  .option('--days-until-due <n>', 'Days until due', '30')
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
        collection_method: 'send_invoice',
        days_until_due: parseInt(opts.daysUntilDue, 10),
      };

      if (opts.description) params.description = opts.description;
      if (opts.autoAdvance) params.auto_advance = true;
      if (opts.metadata) params.metadata = JSON.parse(opts.metadata);

      const invoice = await stripe.invoices.create(params);

      auditLog('create-invoice', { customer: opts.customer }, 'success', invoice.id);

      output({
        id: invoice.id,
        customer: opts.customer,
        status: invoice.status,
        created: new Date(invoice.created * 1000).toISOString(),
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      });
    } catch (err) {
      auditLog('create-invoice', { customer: opts.customer }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
