import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { GitHubCache } from '../types';

const CACHE_FILE = resolve(__dirname, '../../.github-cache.json');

export function loadCache(): GitHubCache | null {
  if (!existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const data = readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(data) as GitHubCache;
  } catch {
    return null;
  }
}

export function saveCache(cache: GitHubCache): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function getCacheFilePath(): string {
  return CACHE_FILE;
}
