import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { basename, join } from 'path';
import { randomUUID } from 'crypto';
import { SplitResult, ChunkInfo, MAX_FILE_SIZE } from '../types';

const execFileAsync = promisify(execFile);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

/**
 * Parse duration strings like "30s", "5m", "15m" into seconds.
 */
export function parseDuration(input: string): number {
  const match = input.match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/i);
  if (!match) {
    throw new Error(`Invalid duration "${input}". Use formats like: 30s, 5m, 1h`);
  }
  const value = parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 'h': return value * 3600;
    case 'm': return value * 60;
    case 's': return value;
    default: return value;
  }
}

/**
 * Split video into chunks of the given duration without re-encoding.
 * Uses ffmpeg -c copy -f segment for fast, lossless splitting.
 * Works directly on any container (mov, avi, etc.) — outputs .mp4 segments in a single pass.
 */
export async function splitVideo(filePath: string, chunkSeconds: number): Promise<SplitResult> {
  if (!(await ffmpegAvailable())) {
    throw new Error('ffmpeg is not installed. Install with: brew install ffmpeg');
  }

  const originalSizeBytes = statSync(filePath).size;
  const uuid = randomUUID().slice(0, 8);
  const tmpDir = `/tmp/analyze-media-split-${uuid}`;
  mkdirSync(tmpDir, { recursive: true });

  try {
    const duration = await getVideoDuration(filePath);

    // If video is shorter than chunk duration and under size limit, no split needed
    if (duration <= chunkSeconds && originalSizeBytes <= MAX_FILE_SIZE) {
      return {
        chunks: [{
          path: filePath,
          index: 0,
          totalChunks: 1,
          sizeBytes: originalSizeBytes,
          sizeFormatted: formatSize(originalSizeBytes),
          compressed: false,
        }],
        tmpDir,
        originalSize: formatSize(originalSizeBytes),
        duration,
        chunkDuration: chunkSeconds,
      };
    }

    // Split without re-encoding — -c copy remuxes into .mp4 segments
    await execFileAsync('ffmpeg', [
      '-i', filePath,
      '-c', 'copy',
      '-f', 'segment',
      '-segment_time', String(chunkSeconds),
      '-reset_timestamps', '1',
      '-y',
      join(tmpDir, 'chunk-%03d.mp4'),
    ]);

    const chunkFiles = readdirSync(tmpDir)
      .filter(f => f.startsWith('chunk-') && f.endsWith('.mp4'))
      .sort();

    if (chunkFiles.length === 0) {
      throw new Error('ffmpeg split produced no output files');
    }

    const totalChunks = chunkFiles.length;
    const chunks: ChunkInfo[] = chunkFiles.map((f, i) => {
      const chunkPath = join(tmpDir, f);
      const size = statSync(chunkPath).size;
      return {
        path: chunkPath,
        index: i,
        totalChunks,
        sizeBytes: size,
        sizeFormatted: formatSize(size),
        compressed: false,
      };
    });

    return {
      chunks,
      tmpDir,
      originalSize: formatSize(originalSizeBytes),
      duration,
      chunkDuration: chunkSeconds,
    };
  } catch (err) {
    cleanupSplit(tmpDir);
    if (err instanceof Error && err.message.includes('ffmpeg is not installed')) {
      throw err;
    }
    throw new Error(`Video split failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const COMPRESS_CONCURRENCY = 4;

/**
 * Compress a single chunk to reduce size.
 * Downscales to 720p (sufficient for Gemini vision), CRF 28, strips audio.
 * Returns path to compressed file (in same directory as input).
 */
export async function compressChunk(chunkPath: string): Promise<string> {
  const compressedPath = chunkPath.replace('.mp4', '-compressed.mp4');

  await execFileAsync('ffmpeg', [
    '-i', chunkPath,
    '-vf', 'scale=-2:720',
    '-c:v', 'libx264',
    '-crf', '28',
    '-preset', 'fast',
    '-an',
    '-y',
    compressedPath,
  ]);

  return compressedPath;
}

/**
 * Check each chunk's size and compress only those exceeding MAX_FILE_SIZE.
 * Compresses up to COMPRESS_CONCURRENCY chunks in parallel.
 * If noCompress is true, throws instead of compressing.
 */
export async function compressOversizedChunks(chunks: ChunkInfo[], noCompress: boolean): Promise<ChunkInfo[]> {
  // First pass: identify which chunks need compression
  const needsCompress: number[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].sizeBytes > MAX_FILE_SIZE) {
      if (noCompress) {
        throw new Error(
          `Chunk ${chunks[i].index + 1} is ${chunks[i].sizeFormatted} (>20MB). Use compression or shorter --chunk duration.`
        );
      }
      needsCompress.push(i);
    }
  }

  if (needsCompress.length === 0) return [...chunks];

  // Compress in parallel batches
  const results = [...chunks];
  let nextIdx = 0;

  async function compressNext(): Promise<void> {
    while (nextIdx < needsCompress.length) {
      const ci = needsCompress[nextIdx++];
      const chunk = chunks[ci];
      const compressedPath = await compressChunk(chunk.path);
      const compressedSize = statSync(compressedPath).size;

      if (compressedSize > MAX_FILE_SIZE) {
        throw new Error(
          `Chunk ${chunk.index + 1} still exceeds 20MB after compression (${formatSize(compressedSize)}). Try a shorter --chunk duration.`
        );
      }

      results[ci] = {
        ...chunk,
        path: compressedPath,
        sizeBytes: compressedSize,
        sizeFormatted: formatSize(compressedSize),
        compressed: true,
      };
    }
  }

  const workers = Array.from(
    { length: Math.min(COMPRESS_CONCURRENCY, needsCompress.length) },
    () => compressNext(),
  );
  await Promise.all(workers);

  return results;
}

export function cleanupSplit(tmpDir: string): void {
  try {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup
  }
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export interface ConvertResult {
  convertedPath: string;
  tmpDir: string;
}

/**
 * Convert a video file to mp4 using ffmpeg.
 * First attempts a fast remux (stream copy) which is near-instant.
 * Falls back to re-encoding only if the remux fails (e.g. incompatible codec).
 * Used only for small convertible files that don't need splitting.
 */
export async function convertToMp4(filePath: string): Promise<ConvertResult> {
  if (!(await ffmpegAvailable())) {
    throw new Error('ffmpeg is not installed. Install with: brew install ffmpeg');
  }

  const uuid = randomUUID().slice(0, 8);
  const tmpDir = `/tmp/analyze-media-convert-${uuid}`;
  mkdirSync(tmpDir, { recursive: true });

  const name = basename(filePath).replace(/\.[^.]+$/, '');
  const outputPath = join(tmpDir, `${name}.mp4`);

  try {
    // Try fast remux first (stream copy, no re-encoding)
    try {
      await execFileAsync('ffmpeg', [
        '-i', filePath,
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y',
        outputPath,
      ], { timeout: 120000 });
    } catch {
      // Remux failed — fall back to re-encoding
      await execFileAsync('ffmpeg', [
        '-i', filePath,
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath,
      ]);
    }

    if (!existsSync(outputPath)) {
      throw new Error('ffmpeg conversion produced no output file');
    }

    return { convertedPath: outputPath, tmpDir };
  } catch (err) {
    cleanupSplit(tmpDir);
    throw new Error(`Video conversion failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
