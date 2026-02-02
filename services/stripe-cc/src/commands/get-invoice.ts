import { Command } from 'commander';
import { getStripe, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const getInvoice = new Command('get-invoice')
  .description('Get invoice details')
  .argument('<id>', 'Invoice ID')
  .action(async (id: string) => {
    try {
      const stripe = getStripe();
      const inv = await stripe.invoices.retrieve(id, {
        expand: ['customer', 'subscription'],
      });

      const customer = typeof inv.customer === 'string' ? inv.customer : (inv.customer as { email?: string })?.email ?? inv.customer;

      output({
        id: inv.id,
        number: inv.number,
        customer,
        status: inv.status,
        amount: formatAmount(inv.total, inv.currency),
        amount_due: formatAmount(inv.amount_due, inv.currency),
        amount_paid: formatAmount(inv.amount_paid, inv.currency),
        created: new Date(inv.created * 1000).toISOString(),
        due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        paid: inv.paid,
        hosted_invoice_url: inv.hosted_invoice_url,
        pdf: inv.invoice_pdf,
        subscription: typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id,
      });
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
