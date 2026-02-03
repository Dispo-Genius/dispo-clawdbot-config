import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

const KEYCHAIN_ACCOUNT = 'clawdbot';
const CREDENTIALS_FILE = join(homedir(), '.clawdbot', 'credentials.json');
const CREDENTIALS_DIR = join(homedir(), '.clawdbot', 'credentials');

/**
 * Credentials file interface for fallback storage.
 */
interface CredentialsStore {
  keys: Record<string, string>;
}

/**
 * Read credentials from the secure file store.
 */
function readCredentialsFile(): CredentialsStore {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors, return empty store
  }
  return { keys: {} };
}

/**
 * Write credentials to the secure file store.
 */
function writeCredentialsFile(store: CredentialsStore): void {
  const dir = dirname(CREDENTIALS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(store, null, 2), {
    encoding: 'utf-8',
    mode: 0o600, // Owner read/write only
  });
  // Ensure file permissions are correct even if file existed
  chmodSync(CREDENTIALS_FILE, 0o600);
}

/**
 * Read profile-specific credentials from ~/.clawdbot/credentials/{profile}.json
 */
function readProfileCredentials(profile: string): Record<string, string> {
  const profileFile = join(CREDENTIALS_DIR, `${profile}.json`);
  try {
    if (existsSync(profileFile)) {
      const content = readFileSync(profileFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors, return empty
  }
  return {};
}

/**
 * Write profile-specific credentials to ~/.clawdbot/credentials/{profile}.json
 */
function writeProfileCredentials(profile: string, creds: Record<string, string>): void {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  const profileFile = join(CREDENTIALS_DIR, `${profile}.json`);
  writeFileSync(profileFile, JSON.stringify(creds, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  chmodSync(profileFile, 0o600);
}

/**
 * Get a credential from a profile's credential file.
 */
export function getProfileCredential(profile: string, keyName: string): string | undefined {
  const creds = readProfileCredentials(profile);
  return creds[keyName];
}

/**
 * Set a credential in a profile's credential file.
 */
export function setProfileCredential(profile: string, keyName: string, value: string): void {
  const creds = readProfileCredentials(profile);
  creds[keyName] = value;
  writeProfileCredentials(profile, creds);
}

/**
 * Delete a credential from a profile's credential file.
 */
export function deleteProfileCredential(profile: string, keyName: string): boolean {
  const creds = readProfileCredentials(profile);
  if (keyName in creds) {
    delete creds[keyName];
    writeProfileCredentials(profile, creds);
    return true;
  }
  return false;
}

/**
 * List all credentials in a profile's credential file.
 */
export function listProfileCredentials(profile: string): string[] {
  const creds = readProfileCredentials(profile);
  return Object.keys(creds);
}

/**
 * Read a key from macOS Keychain with a specific account.
 */
function getKeychainKeyWithAccount(keyName: string, account: string): string | undefined {
  try {
    const result = execSync(
      `security find-generic-password -a "${account}" -s "${keyName}" -w 2>/dev/null`,
      { encoding: 'utf-8' }
    );
    return result.trim();
  } catch {
    return undefined;
  }
}

/**
 * Read a key from macOS Keychain.
 * Uses the `security` command-line tool.
 *
 * @param keyName - The service name (e.g., "OPENAI_API_KEY")
 * @returns The key value, or undefined if not found
 */
export function getKeychainKey(keyName: string): string | undefined {
  try {
    const result = execSync(
      `security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${keyName}" -w 2>/dev/null`,
      { encoding: 'utf-8' }
    );
    return result.trim();
  } catch {
    return undefined;
  }
}

/**
 * Read a key from the credentials file (fallback for headless servers).
 *
 * @param keyName - The key name
 * @returns The key value, or undefined if not found
 */
export function getCredentialsFileKey(keyName: string): string | undefined {
  const store = readCredentialsFile();
  return store.keys[keyName];
}

/**
 * Store a key in macOS Keychain.
 * Deletes any existing key with the same name first.
 *
 * @param keyName - The service name (e.g., "OPENAI_API_KEY")
 * @param value - The key value to store
 */
export function setKeychainKey(keyName: string, value: string): void {
  // Delete existing if present (ignore errors)
  try {
    execSync(
      `security delete-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${keyName}" 2>/dev/null`,
      { encoding: 'utf-8' }
    );
  } catch {
    // Ignore - key may not exist
  }

  // Try to add to keychain
  try {
    execSync(
      `security add-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${keyName}" -w "${value.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8' }
    );
  } catch {
    // Keychain failed (common on headless servers), fall back to credentials file
    console.log(`[keychain] Keychain unavailable, storing in credentials file`);
    setCredentialsFileKey(keyName, value);
  }
}

/**
 * Store a key in the credentials file (fallback).
 *
 * @param keyName - The key name
 * @param value - The key value
 */
export function setCredentialsFileKey(keyName: string, value: string): void {
  const store = readCredentialsFile();
  store.keys[keyName] = value;
  writeCredentialsFile(store);
}

/**
 * Delete a key from macOS Keychain.
 *
 * @param keyName - The service name to delete
 * @returns true if deleted, false if not found
 */
export function deleteKeychainKey(keyName: string): boolean {
  try {
    execSync(
      `security delete-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${keyName}" 2>/dev/null`,
      { encoding: 'utf-8' }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a key from the credentials file.
 *
 * @param keyName - The key name
 * @returns true if deleted
 */
export function deleteCredentialsFileKey(keyName: string): boolean {
  const store = readCredentialsFile();
  if (keyName in store.keys) {
    delete store.keys[keyName];
    writeCredentialsFile(store);
    return true;
  }
  return false;
}

/**
 * List all key names stored in Keychain for the clawdbot account.
 *
 * @returns Array of key names
 */
export function listKeychainKeys(): string[] {
  const keychainKeys: string[] = [];

  // Try keychain first
  try {
    const result = execSync(
      `security dump-keychain 2>/dev/null | grep -A4 'acct.*="${KEYCHAIN_ACCOUNT}"' | grep '"svce"' | sed 's/.*="\\([^"]*\\)".*/\\1/'`,
      { encoding: 'utf-8', shell: '/bin/bash' }
    );
    keychainKeys.push(
      ...result
        .trim()
        .split('\n')
        .filter(Boolean)
        .filter((key) => key !== '0x00000007')
    );
  } catch {
    // Keychain not available
  }

  // Also include credentials file keys
  const store = readCredentialsFile();
  const fileKeys = Object.keys(store.keys);

  // Merge unique keys
  const allKeys = new Set([...keychainKeys, ...fileKeys]);
  return Array.from(allKeys);
}

/**
 * Check if a key exists in Keychain.
 *
 * @param keyName - The service name to check
 * @returns true if the key exists
 */
export function hasKeychainKey(keyName: string): boolean {
  try {
    execSync(
      `security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "${keyName}" 2>/dev/null`,
      { encoding: 'utf-8' }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a key, checking keychain first, then credentials file, then environment variables.
 * This is the primary function services should use.
 *
 * When profile is provided, lookup order is:
 * 1. Profile credentials file: ~/.clawdbot/credentials/{profile}.json
 * 2. Keychain with profile as account
 * 3. Global keychain (clawdbot account)
 * 4. Global credentials.json
 * 5. Environment variables
 *
 * @param keyName - The key name (e.g., "OPENAI_API_KEY")
 * @param profile - Optional credential profile name
 * @returns The key value, or undefined if not found in any location
 */
export function getKey(keyName: string, profile?: string): string | undefined {
  // Use default profile from env if not provided
  const effectiveProfile = profile ?? process.env.DEFAULT_CREDENTIAL_PROFILE;

  // Profile-specific lookups first
  if (effectiveProfile) {
    // 1. Profile credentials file
    const profileValue = getProfileCredential(effectiveProfile, keyName);
    if (profileValue) {
      return profileValue;
    }

    // 2. Keychain with profile as account
    const profileKeychainValue = getKeychainKeyWithAccount(keyName, effectiveProfile);
    if (profileKeychainValue) {
      return profileKeychainValue;
    }
  }

  // 3. Global keychain (clawdbot account)
  const keychainValue = getKeychainKey(keyName);
  if (keychainValue) {
    return keychainValue;
  }

  // 4. Global credentials file
  const fileValue = getCredentialsFileKey(keyName);
  if (fileValue) {
    return fileValue;
  }

  // 5. Fall back to environment variable
  return process.env[keyName];
}

/**
 * Get the source of a key (for debugging/status).
 *
 * @param keyName - The key name
 * @returns The source: 'keychain', 'credentials', 'env', or undefined
 */
export function getKeySource(
  keyName: string
): 'keychain' | 'credentials' | 'env' | undefined {
  if (getKeychainKey(keyName)) return 'keychain';
  if (getCredentialsFileKey(keyName)) return 'credentials';
  if (process.env[keyName]) return 'env';
  return undefined;
}
