/**
 * Usage data store - persists account usage to JSON file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AccountUsage, UsageStore } from './types';
import { calculateResetTime } from './selector';

const STORE_VERSION = 1;

/**
 * Get path to usage data file
 */
export function getStorePath(): string {
  return path.join(os.homedir(), '.claude/services/gateway-cc/data/usage.json');
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  const dir = path.dirname(getStorePath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load usage store from disk
 */
export function loadStore(): UsageStore {
  const storePath = getStorePath();

  if (!fs.existsSync(storePath)) {
    return { version: STORE_VERSION, accounts: {} };
  }

  try {
    const data = fs.readFileSync(storePath, 'utf-8');
    const store = JSON.parse(data) as UsageStore;

    // Migrate if needed
    if (store.version !== STORE_VERSION) {
      console.log(`[account-selector] Migrating store from v${store.version} to v${STORE_VERSION}`);
      store.version = STORE_VERSION;
    }

    return store;
  } catch (err) {
    console.error(`[account-selector] Failed to load store: ${err}`);
    return { version: STORE_VERSION, accounts: {} };
  }
}

/**
 * Save usage store to disk
 */
export function saveStore(store: UsageStore): void {
  ensureDataDir();
  const storePath = getStorePath();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

/**
 * Get all accounts
 */
export function getAllAccounts(): AccountUsage[] {
  const store = loadStore();
  return Object.values(store.accounts);
}

/**
 * Get account by ID
 */
export function getAccount(id: string): AccountUsage | null {
  const store = loadStore();
  return store.accounts[id] ?? null;
}

/**
 * Update or create account usage
 */
export function updateAccount(
  id: string,
  update: Partial<Omit<AccountUsage, 'id' | 'lastUpdated'>>
): AccountUsage {
  const store = loadStore();
  const existing = store.accounts[id];

  const account: AccountUsage = {
    id,
    email: update.email ?? existing?.email,
    authType: update.authType ?? existing?.authType,
    usagePercent: update.usagePercent ?? existing?.usagePercent ?? 0,
    resetTime: update.resetTime ?? existing?.resetTime ?? new Date().toISOString(),
    claudeCodeFirstTokenDate:
      update.claudeCodeFirstTokenDate ?? existing?.claudeCodeFirstTokenDate ?? new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    notes: update.notes ?? existing?.notes,
  };

  // If first token date changed, recalculate reset time
  if (update.claudeCodeFirstTokenDate && !update.resetTime) {
    account.resetTime = calculateResetTime(update.claudeCodeFirstTokenDate);
  }

  store.accounts[id] = account;
  saveStore(store);

  return account;
}

/**
 * Delete account
 */
export function deleteAccount(id: string): boolean {
  const store = loadStore();
  if (store.accounts[id]) {
    delete store.accounts[id];
    saveStore(store);
    return true;
  }
  return false;
}

/**
 * Initialize accounts from CCS instances
 * Reads claudeCodeFirstTokenDate from each instance's .claude.json
 */
export function initializeFromCCS(ccsInstancesPath: string): AccountUsage[] {
  const accounts: AccountUsage[] = [];

  if (!fs.existsSync(ccsInstancesPath)) {
    console.log(`[account-selector] CCS instances path not found: ${ccsInstancesPath}`);
    return accounts;
  }

  const instances = fs.readdirSync(ccsInstancesPath);

  for (const instance of instances) {
    if (instance.startsWith('.')) continue;

    const claudeJsonPath = path.join(ccsInstancesPath, instance, '.claude.json');
    if (!fs.existsSync(claudeJsonPath)) continue;

    try {
      const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
      const firstTokenDate = claudeJson.claudeCodeFirstTokenDate;

      if (!firstTokenDate) {
        console.log(`[account-selector] No claudeCodeFirstTokenDate in ${instance}`);
        continue;
      }

      const account = updateAccount(instance, {
        claudeCodeFirstTokenDate: firstTokenDate,
        usagePercent: 0, // Start at 0, user needs to update manually
        notes: `Initialized from CCS instance`,
      });

      accounts.push(account);
      console.log(`[account-selector] Initialized ${instance} (resets: ${account.resetTime})`);
    } catch (err) {
      console.error(`[account-selector] Failed to read ${claudeJsonPath}: ${err}`);
    }
  }

  return accounts;
}
