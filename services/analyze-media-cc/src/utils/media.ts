import { existsSync, statSync } from 'fs';
import { extname, resolve } from 'path';
import { glob } from 'glob';
import { SUPPORTED_FORMATS, CONVERTIBLE_FORMATS, MAX_FILE_SIZE, MediaInfo } from '../types';
import { isVideoFile } from './video';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export interface MediaInfoResult {
  media: MediaInfo;
  needsConversion: boolean;
  originalPath: string;
}

export function getMediaInfo(filePath: string, skipSizeCheck = false): MediaInfoResult {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = extname(resolvedPath).toLowerCase();
  const mimeType = SUPPORTED_FORMATS[ext];

  // Convertible format — defer actual conversion, just record metadata
  if (!mimeType && CONVERTIBLE_FORMATS[ext]) {
    const stats = statSync(resolvedPath);
    return {
      media: {
        path: resolvedPath,
        mimeType: 'video/mp4',
        sizeBytes: stats.size,
        sizeFormatted: formatSize(stats.size),
      },
      needsConversion: true,
      originalPath: resolvedPath,
    };
  }

  if (!mimeType) {
    const supported = [...Object.keys(SUPPORTED_FORMATS), ...Object.keys(CONVERTIBLE_FORMATS)].join(', ');
    throw new Error(`Unsupported format: ${ext}. Supported: ${supported}`);
  }

  const stats = statSync(resolvedPath);

  if (!skipSizeCheck && stats.size > MAX_FILE_SIZE && !isVideoFile(mimeType)) {
    throw new Error(`File too large: ${formatSize(stats.size)} (max ${formatSize(MAX_FILE_SIZE)})`);
  }

  return {
    media: {
      path: resolvedPath,
      mimeType,
      sizeBytes: stats.size,
      sizeFormatted: formatSize(stats.size),
    },
    needsConversion: false,
    originalPath: resolvedPath,
  };
}

export function needsAutoSplit(media: MediaInfo): boolean {
  return isVideoFile(media.mimeType) && media.sizeBytes > MAX_FILE_SIZE;
}

export async function expandGlobs(patterns: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const matches = await glob(pattern, { nodir: true });
      files.push(...matches.sort());
    } else {
      files.push(pattern);
    }
  }
  return files;
}

/**
 * Run promises with a concurrency limit.
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}
