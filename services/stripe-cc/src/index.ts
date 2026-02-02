#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from multiple locations
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(homedir(), '.claude/.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
    break;
  }
}

async function main() {
  const { Command } = await import('commander');
  const { setGlobalFormat } = await import('./utils/output.js');
  type OutputFormat = 'json' | 'table' | 'compact';

  // Import commands
  const { listCustomers } = await import('./commands/list-customers.js');
  const { searchCustomers } = await import('./commands/search-customers.js');
  const { getCustomer } = await import('./commands/get-customer.js');
  const { listInvoices } = await import('./commands/list-invoices.js');
  const { getInvoice } = await import('./commands/get-invoice.js');
  const { listSubscriptions } = await import('./commands/list-subscriptions.js');
  const { getSubscription } = await import('./commands/get-subscription.js');
  const { listCharges } = await import('./commands/list-charges.js');
  const { listPaymentIntents } = await import('./commands/list-payment-intents.js');
  const { listPaymentLinks } = await import('./commands/list-payment-links.js');
  const { createCustomer } = await import('./commands/create-customer.js');
  const { updateCustomer } = await import('./commands/update-customer.js');
  const { createSubscription } = await import('./commands/create-subscription.js');
  const { cancelSubscription } = await import('./commands/cancel-subscription.js');
  const { charge } = await import('./commands/charge.js');
  const { refund } = await import('./commands/refund.js');
  const { createInvoice } = await import('./commands/create-invoice.js');
  const { addInvoiceItem } = await import('./commands/add-invoice-item.js');
  const { sendInvoice } = await import('./commands/send-invoice.js');
  const { voidInvoice } = await import('./commands/void-invoice.js');
  const { markPaid } = await import('./commands/mark-paid.js');
  const { createPaymentLink } = await import('./commands/create-payment-link.js');

  const program = new Command();

  program
    .name('stripe-cc')
    .description('Stripe CLI for Claude Code with fail-first approval')
    .version('1.0.0')
    .option('-f, --format <format>', 'Output format: compact (default), table, json', 'compact')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.format && ['compact', 'table', 'json'].includes(opts.format)) {
        setGlobalFormat(opts.format as OutputFormat);
      }
    });

  // Read-only commands (auto-approved)
  program.addCommand(listCustomers);
  program.addCommand(searchCustomers);
  program.addCommand(getCustomer);
  program.addCommand(listInvoices);
  program.addCommand(getInvoice);
  program.addCommand(listSubscriptions);
  program.addCommand(getSubscription);
  program.addCommand(listCharges);
  program.addCommand(listPaymentIntents);
  program.addCommand(listPaymentLinks);

  // Write commands (require confirmation)
  program.addCommand(createCustomer);
  program.addCommand(updateCustomer);
  program.addCommand(createSubscription);
  program.addCommand(cancelSubscription);
  program.addCommand(charge);
  program.addCommand(refund);
  program.addCommand(createInvoice);
  program.addCommand(addInvoiceItem);
  program.addCommand(sendInvoice);
  program.addCommand(voidInvoice);
  program.addCommand(markPaid);
  program.addCommand(createPaymentLink);

  // Configure help-on-error for all subcommands
  program.commands.forEach((cmd) => cmd.showHelpAfterError(true));

  program.parse(process.argv);
}

main().catch(console.error);
