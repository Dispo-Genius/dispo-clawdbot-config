import { Command } from 'commander';
import { getStripe, isLiveMode } from '../utils/stripe.js';
import { output, error } from '../utils/output.js';
import { auditLog } from '../utils/audit.js';

export const cancelSubscription = new Command('cancel-subscription')
  .description('Cancel a subscription')
  .argument('<id>', 'Subscription ID')
  .option('--immediately', 'Cancel immediately instead of at period end')
  .option('--live-mode-confirmed', 'Confirm live mode operation')
  .action(async (id: string, opts) => {
    try {
      // Live mode protection
      if (isLiveMode() && !opts.liveModeConfirmed) {
        error('Live mode detected. Re-run with --live-mode-confirmed to execute.', 3);
      }

      const stripe = getStripe();

      let sub;
      if (opts.immediately) {
        sub = await stripe.subscriptions.cancel(id);
      } else {
        sub = await stripe.subscriptions.update(id, {
          cancel_at_period_end: true,
        });
      }

      auditLog('cancel-subscription', { id, immediately: opts.immediately }, 'success', sub.id);

      output({
        id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
    } catch (err) {
      auditLog('cancel-subscription', { id }, 'error', err instanceof Error ? err.message : String(err));
      error(err instanceof Error ? err.message : String(err));
    }
  });
