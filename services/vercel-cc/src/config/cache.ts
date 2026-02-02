import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import type { VercelCache, CachedProject } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE_FILENAME = '.vercel-cache.json';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCachePath(): string {
  // Try tool directory first
  const toolPath = join(__dirname, '..', '..', CACHE_FILENAME);
  if (existsSync(dirname(toolPath))) {
    return toolPath;
  }

  // Fallback to home directory
  const homePath = join(homedir(), '.claude', CACHE_FILENAME);
  return homePath;
}

export function loadCache(): VercelCache | null {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const data = readFileSync(cachePath, 'utf-8');
    return JSON.parse(data) as VercelCache;
  } catch {
    return null;
  }
}

export function saveCache(cache: VercelCache): void {
  const cachePath = getCachePath();
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export function isCacheStale(cache: VercelCache | null): boolean {
  if (!cache) return true;
  const age = Date.now() - cache.lastSync;
  return age > CACHE_MAX_AGE_MS;
}

export function getCacheAgeString(cache: VercelCache | null): string {
  if (!cache) return 'No cache';

  const ageMs = Date.now() - cache.lastSync;
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} old`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} old`;
  }
  return 'Recently synced';
}

export function resolveProjectId(
  cache: VercelCache | null,
  nameOrId: string
): string | null {
  if (!cache) return null;

  // Direct ID match
  if (cache.projects[nameOrId]) {
    return nameOrId;
  }

  // Name match (case-insensitive)
  const normalized = nameOrId.toLowerCase();
  for (const [id, project] of Object.entries(cache.projects)) {
    if (project.name.toLowerCase() === normalized) {
      return id;
    }
  }

  return null;
}

export function getProjectFromCache(
  cache: VercelCache | null,
  nameOrId: string
): CachedProject | null {
  if (!cache) return null;

  const id = resolveProjectId(cache, nameOrId);
  if (id && cache.projects[id]) {
    return cache.projects[id];
  }

  return null;
}

export function listCachedProjects(cache: VercelCache | null): CachedProject[] {
  if (!cache) return [];
  return Object.values(cache.projects);
}

export function warnIfStale(cache: VercelCache | null): void {
  if (isCacheStale(cache)) {
    console.error(
      JSON.stringify({
        warning: `Cache is stale (${getCacheAgeString(cache)}). Consider running \`sync\` command.`,
      })
    );
  }
}
