import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;
let useTestMode = false;

/**
 * Set test mode globally. Call before any Stripe operations.
 */
export function setTestMode(test: boolean): void {
  if (stripeInstance && test !== useTestMode) {
    // Reset instance if mode changed
    stripeInstance = null;
  }
  useTestMode = test;
}

/**
 * Get Stripe API key from environment variable.
 * Uses STRIPE_TEST_KEY in test mode, STRIPE_SECRET_KEY in live mode.
 */
function getApiKey(): string {
  const envVar = useTestMode ? 'STRIPE_TEST_KEY' : 'STRIPE_SECRET_KEY';
  const apiKey = process.env[envVar];
  if (!apiKey) {
    throw new Error(`${envVar} not set. Ensure gateway is configured with authVars.`);
  }
  return apiKey;
}

/**
 * Get or create Stripe instance.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getApiKey(), {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripeInstance;
}

/**
 * Check if running in live mode (sk_live_*).
 */
export function isLiveMode(): boolean {
  return getApiKey().startsWith('sk_live_');
}

/**
 * Format amount for display (cents to dollars).
 */
export function formatAmount(amountCents: number, currency: string = 'usd'): string {
  const dollars = amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(dollars);
}
