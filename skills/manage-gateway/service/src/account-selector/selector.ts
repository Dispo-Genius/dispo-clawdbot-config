/**
 * Account selection algorithm based on urgency
 *
 * Urgency = remaining_quota / hours_until_reset
 *
 * Higher urgency = use this account first (quota expires soon)
 */

import type { AccountUsage, SelectionResult, AccountStatus, AllAccountsStatus } from './types';

/**
 * Calculate hours until reset from reset time
 */
export function hoursUntilReset(resetTime: string): number {
  const resetDate = new Date(resetTime);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return Math.max(0, hours); // Don't return negative
}

/**
 * Calculate the NEXT reset time from first token date
 *
 * Reset happens every 7 days from the first token date.
 * This finds the next upcoming reset.
 */
export function calculateResetTime(firstTokenDate: string): string {
  const firstToken = new Date(firstTokenDate);
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // Calculate how many complete weeks have passed since first token
  const msSinceFirst = now.getTime() - firstToken.getTime();
  const completedWeeks = Math.floor(msSinceFirst / weekMs);

  // Next reset is (completedWeeks + 1) weeks after first token
  const nextReset = new Date(firstToken.getTime() + (completedWeeks + 1) * weekMs);

  return nextReset.toISOString();
}

/**
 * Format hours as human-readable string
 */
export function formatHoursRemaining(hours: number): string {
  if (hours <= 0) return 'now';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

/**
 * Calculate urgency score for an account
 *
 * Urgency = remaining% / hours_until_reset
 *
 * Higher urgency means we should use this account first.
 * Accounts with quota expiring soon get higher urgency.
 */
export function calculateUrgency(account: AccountUsage): number {
  const remaining = 100 - account.usagePercent;
  const hours = hoursUntilReset(account.resetTime);

  // If no time left, urgency is infinite (but we can't use it)
  if (hours <= 0) return 0;

  // If fully used, urgency is 0
  if (remaining <= 0) return 0;

  return remaining / hours;
}

/**
 * Get status for a single account
 */
export function getAccountStatus(account: AccountUsage): AccountStatus {
  const hours = hoursUntilReset(account.resetTime);
  const remaining = 100 - account.usagePercent;

  return {
    id: account.id,
    usagePercent: account.usagePercent,
    remainingPercent: remaining,
    hoursUntilReset: Math.round(hours * 10) / 10,
    resetsIn: formatHoursRemaining(hours),
    urgency: Math.round(calculateUrgency(account) * 100) / 100,
    exhausted: account.usagePercent >= 100,
    lastUpdated: account.lastUpdated,
  };
}

/**
 * Select the optimal account based on urgency
 *
 * Returns the account with highest urgency (most quota expiring soonest)
 */
export function selectAccount(accounts: AccountUsage[]): SelectionResult | null {
  if (accounts.length === 0) {
    return null;
  }

  // Calculate urgency for each account
  const scored = accounts.map((account) => ({
    account,
    urgency: calculateUrgency(account),
    hours: hoursUntilReset(account.resetTime),
    remaining: 100 - account.usagePercent,
  }));

  // Filter out exhausted accounts
  const available = scored.filter((s) => s.remaining > 0 && s.hours > 0);

  if (available.length === 0) {
    // All accounts exhausted - return the one that resets soonest
    const soonestReset = scored.sort((a, b) => a.hours - b.hours)[0];
    return {
      account: soonestReset.account.id,
      urgency: 0,
      usagePercent: soonestReset.account.usagePercent,
      remainingPercent: soonestReset.remaining,
      hoursUntilReset: Math.round(soonestReset.hours * 10) / 10,
      resetsIn: formatHoursRemaining(soonestReset.hours),
      reason: 'All accounts exhausted - this one resets soonest',
    };
  }

  // Sort by urgency (highest first)
  available.sort((a, b) => b.urgency - a.urgency);
  const selected = available[0];

  // Determine reason
  let reason = 'Highest urgency - quota expires soonest relative to remaining';
  if (available.length === 1) {
    reason = 'Only available account';
  } else if (selected.hours < 24) {
    reason = `Urgent: only ${formatHoursRemaining(selected.hours)} until reset`;
  }

  return {
    account: selected.account.id,
    urgency: Math.round(selected.urgency * 100) / 100,
    usagePercent: selected.account.usagePercent,
    remainingPercent: selected.remaining,
    hoursUntilReset: Math.round(selected.hours * 10) / 10,
    resetsIn: formatHoursRemaining(selected.hours),
    reason,
  };
}

/**
 * Get status of all accounts
 */
export function getAllAccountsStatus(accounts: AccountUsage[]): AllAccountsStatus {
  const statuses = accounts.map(getAccountStatus);
  const selection = selectAccount(accounts);

  // Sort by urgency (highest first)
  statuses.sort((a, b) => b.urgency - a.urgency);

  const allExhausted = statuses.every((s) => s.exhausted);

  return {
    accounts: statuses,
    recommended: selection?.account ?? null,
    message: allExhausted ? 'All accounts exhausted. Wait for reset.' : undefined,
  };
}
