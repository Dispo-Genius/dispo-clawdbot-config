import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { SlackCache } from '../types';

const CACHE_FILE = join(__dirname, '../../.slack-cache.json');
const STALE_THRESHOLD_HOURS = 24;

export function loadCache(): SlackCache | null {
  if (!existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(content) as SlackCache;
  } catch {
    return null;
  }
}

export function saveCache(cache: SlackCache): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function isCacheStale(cache: SlackCache): boolean {
  const lastSynced = new Date(cache.lastSynced);
  const now = new Date();
  const diffHours = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60);
  return diffHours > STALE_THRESHOLD_HOURS;
}

export function getCacheFilePath(): string {
  return CACHE_FILE;
}

/**
 * Check cache and warn if stale. Returns the cache if valid, or null if missing.
 * Outputs warning to stderr so it doesn't interfere with JSON output.
 */
export function loadCacheWithWarning(): SlackCache | null {
  const cache = loadCache();

  if (!cache) {
    return null;
  }

  if (isCacheStale(cache)) {
    console.error(JSON.stringify({
      warning: 'Cache is stale. Consider running `sync` to refresh channel and member data.',
    }));
  }

  return cache;
}
