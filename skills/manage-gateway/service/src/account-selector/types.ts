/**
 * Account usage tracking for quota optimization
 */

export interface AccountUsage {
  /** Unique account identifier (e.g., "account1", "account2") */
  id: string;
  /** Current usage percentage (0-100) - manually updated or from API */
  usagePercent: number;
  /** When the weekly quota resets (ISO 8601) */
  resetTime: string;
  /** When first token was used in current cycle (ISO 8601) */
  claudeCodeFirstTokenDate: string;
  /** Last time usage was updated (ISO 8601) */
  lastUpdated: string;
  /** Optional notes (e.g., "Primary account", "Backup") */
  notes?: string;
  /** Account email (if known) */
  email?: string;
  /** Authentication type (oauth, api-key) */
  authType?: string;
}

/**
 * Real-time usage from Anthropic API
 */
export interface RealTimeUsage {
  /** Account ID */
  id: string;
  /** 5-hour rolling window usage */
  fiveHour: {
    utilization: number;
    resetsAt: string | null;
  };
  /** 7-day rolling window usage */
  sevenDay: {
    utilization: number;
    resetsAt: string | null;
  };
  /** Subscription type (pro, max, etc.) */
  subscriptionType: string;
  /** Rate limit tier */
  rateLimitTier: string;
  /** OAuth access token (for local credential injection) */
  accessToken?: string;
}

export interface UsageStore {
  /** Version for schema migrations */
  version: number;
  /** Map of account ID to usage data */
  accounts: Record<string, AccountUsage>;
}

export interface SelectionResult {
  /** Selected account ID */
  account: string;
  /** Urgency score (higher = use sooner) */
  urgency: number;
  /** Current usage percentage */
  usagePercent: number;
  /** Remaining quota percentage */
  remainingPercent: number;
  /** Hours until quota resets */
  hoursUntilReset: number;
  /** Human-readable time until reset */
  resetsIn: string;
  /** Why this account was selected */
  reason: string;
}

export interface AccountStatus {
  /** Account ID */
  id: string;
  /** Current usage percentage */
  usagePercent: number;
  /** Remaining quota percentage */
  remainingPercent: number;
  /** Hours until quota resets */
  hoursUntilReset: number;
  /** Human-readable time until reset */
  resetsIn: string;
  /** Urgency score */
  urgency: number;
  /** Whether account is exhausted (100% used) */
  exhausted: boolean;
  /** Last updated timestamp */
  lastUpdated: string;
}

export interface AllAccountsStatus {
  /** All accounts with their status */
  accounts: AccountStatus[];
  /** Currently recommended account */
  recommended: string | null;
  /** Message if all accounts exhausted */
  message?: string;
}
