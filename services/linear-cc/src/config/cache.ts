import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';
import type { LinearCache } from '../types';

const STALE_THRESHOLD_DAYS = 7;

/**
 * Get session ID from CLAUDE_CONFIG_DIR for per-session cache isolation.
 * Prevents cache corruption when running multiple Claude Code sessions.
 */
function getSessionId(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    // Extract instance name: /Users/x/.ccs/instances/account2 → account2
    const match = configDir.match(/instances\/([^/]+)/);
    if (match) return match[1];
  }
  // Fallback: use shared cache (backwards compatible)
  return 'shared';
}

/**
 * Get cache file path with fallback chain.
 * Handles different execution contexts (tsx vs compiled, different CWDs).
 */
function resolveCacheFilePath(): string {
  const sessionId = getSessionId();
  const filename = sessionId === 'shared'
    ? '.linear-cache.json'
    : `.linear-cache-${sessionId}.json`;

  const candidates = [
    resolve(process.cwd(), `.claude/tools/linear-cc/${filename}`),
    join(__dirname, `../../${filename}`),
    join(homedir(), `.claude/${filename}`),
  ];

  // Return first existing path, or first candidate for new cache
  return candidates.find(existsSync) || candidates[0];
}

export function loadCache(): LinearCache | null {
  const cacheFile = resolveCacheFilePath();

  if (!existsSync(cacheFile)) {
    return null;
  }

  try {
    const content = readFileSync(cacheFile, 'utf-8');
    return JSON.parse(content) as LinearCache;
  } catch {
    return null;
  }
}

export function saveCache(cache: LinearCache): void {
  const cacheFile = resolveCacheFilePath();

  // Ensure directory exists
  const dir = dirname(cacheFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

export function isCacheStale(cache: LinearCache): boolean {
  const lastSynced = new Date(cache.lastSynced);
  const now = new Date();
  const diffDays = (now.getTime() - lastSynced.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > STALE_THRESHOLD_DAYS;
}

export function getCacheFilePath(): string {
  return resolveCacheFilePath();
}
