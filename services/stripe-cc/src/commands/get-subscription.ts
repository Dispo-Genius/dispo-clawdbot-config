import { Command } from 'commander';
import { getStripe, formatAmount } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const getSubscription = new Command('get-subscription')
  .description('Get subscription details')
  .argument('<id>', 'Subscription ID')
  .action(async (id: string) => {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(id, {
        expand: ['customer', 'default_payment_method', 'latest_invoice'],
      });

      const customer = typeof sub.customer === 'string'
        ? sub.customer
        : (sub.customer as { email?: string })?.email ?? sub.customer.id;

      const items = sub.items.data.map((item) => ({
        id: item.id,
        price: item.price.id,
        product: typeof item.price.product === 'string' ? item.price.product : item.price.product.id,
        quantity: item.quantity,
        amount: formatAmount(item.price.unit_amount ?? 0, item.price.currency),
        interval: `${item.price.recurring?.interval_count ?? 1} ${item.price.recurring?.interval ?? 'month'}`,
      }));

      output({
        id: sub.id,
        customer,
        status: sub.status,
        created: new Date(sub.created * 1000).toISOString(),
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        items: JSON.stringify(items),
        metadata: JSON.stringify(sub.metadata),
      });
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
