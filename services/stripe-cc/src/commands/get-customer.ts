import { Command } from 'commander';
import { getStripe } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';

export const getCustomer = new Command('get-customer')
  .description('Get customer details')
  .argument('<id>', 'Customer ID')
  .action(async (id: string) => {
    try {
      const stripe = getStripe();
      const customer = await stripe.customers.retrieve(id, {
        expand: ['subscriptions', 'default_source'],
      });

      if (customer.deleted) {
        error(`Customer ${id} has been deleted`);
      }

      const c = customer as Stripe.Customer;
      output({
        id: c.id,
        email: c.email,
        name: c.name,
        phone: c.phone,
        created: new Date(c.created * 1000).toISOString(),
        balance: c.balance,
        currency: c.currency,
        delinquent: c.delinquent,
        description: c.description,
        subscriptions: c.subscriptions?.data.length ?? 0,
        metadata: JSON.stringify(c.metadata),
      });
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });

import Stripe from 'stripe';
