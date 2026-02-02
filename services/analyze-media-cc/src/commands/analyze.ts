import { Command } from 'commander';
import { statSync } from 'fs';
import { extname } from 'path';
import { analyzeMedia, analyzeMultipleMedia } from '../api/gemini';
import { AnalyzeOptions, MAX_FILE_SIZE, MediaInfo, AnalysisResult, OutputFormat, SplitMode, ChunkInfo } from '../types';
import { formatAnalysisResult, formatMultiAnalysisResult, formatSplitAnalysisResult, SplitAnalysisResult, errorOutput, output, getFormat } from '../utils/output';
import { splitVideo, compressOversizedChunks, cleanupSplit, parseDuration, convertToMp4 } from '../utils/video';
import { formatSize, getMediaInfo, needsAutoSplit, expandGlobs, parallelLimit } from '../utils/media';

const MAX_CONCURRENCY = 4;

/**
 * Parallel mode: each chunk gets its own Gemini call with position context.
 */
async function analyzeParallel(
  chunks: ChunkInfo[],
  prompt: string,
): Promise<{ part: number; analysis: string }[]> {
  const tasks = chunks.map((chunk) => async () => {
    output(`[split] Part ${chunk.index + 1}/${chunk.totalChunks} analyzing...`);
    const media: MediaInfo = {
      path: chunk.path,
      mimeType: 'video/mp4',
      sizeBytes: chunk.sizeBytes,
      sizeFormatted: chunk.sizeFormatted,
    };
    const partPrompt = `[Part ${chunk.index + 1} of ${chunk.totalChunks}]\n\n${prompt}`;
    const analysis = await analyzeMedia(media, partPrompt);
    return { part: chunk.index + 1, analysis };
  });

  return parallelLimit(tasks, MAX_CONCURRENCY);
}

/**
 * Sequential mode: send chunks in pairs, each batch after the first
 * receives a summary of prior analysis.
 */
async function analyzeSequential(
  chunks: ChunkInfo[],
  prompt: string,
): Promise<{ part: number; analysis: string }[]> {
  const results: { part: number; analysis: string }[] = [];
  let priorSummary = '';

  // Process in pairs
  for (let i = 0; i < chunks.length; i += 2) {
    const batch = chunks.slice(i, i + 2);
    const batchMedia: MediaInfo[] = batch.map(c => ({
      path: c.path,
      mimeType: 'video/mp4',
      sizeBytes: c.sizeBytes,
      sizeFormatted: c.sizeFormatted,
    }));

    const partLabels = batch.map(c => `Part ${c.index + 1}`).join(', ');
    output(`[split] ${partLabels} of ${chunks[0].totalChunks} analyzing...`);

    let batchPrompt = '';
    if (priorSummary) {
      batchPrompt += `[Prior analysis summary]\n${priorSummary}\n\n`;
    }
    batchPrompt += `[Parts ${batch[0].index + 1}-${batch[batch.length - 1].index + 1} of ${chunks[0].totalChunks}]\n\n${prompt}`;

    const analysis = batchMedia.length === 1
      ? await analyzeMedia(batchMedia[0], batchPrompt)
      : await analyzeMultipleMedia(batchMedia, batchPrompt);

    // Each batch produces one combined result per chunk range
    for (const c of batch) {
      results.push({ part: c.index + 1, analysis });
    }

    // Build summary for next batch (truncate to keep context reasonable)
    const summaryLines = analysis.split('\n').slice(0, 10).join('\n');
    priorSummary += (priorSummary ? '\n\n' : '') + `[Parts ${batch[0].index + 1}-${batch[batch.length - 1].index + 1}]: ${summaryLines}`;
  }

  // Deduplicate — sequential pairs share analysis text, keep unique per batch
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.analysis)) return false;
    seen.add(r.analysis);
    return true;
  });
}

async function analyzeWithSplit(
  media: MediaInfo,
  originalPath: string,
  options: AnalyzeOptions,
  format: OutputFormat,
): Promise<void> {
  const chunkSeconds = parseDuration(options.chunk || '5m');
  const mode: SplitMode = options.mode || 'parallel';
  const noCompress = options.noCompress || false;

  output(`[split] Video ${media.sizeFormatted} exceeds 20MB. Splitting into ${options.chunk || '5m'} chunks (${mode} mode)...`);

  // splitVideo handles any container directly — .mov, .avi, etc.
  // -c copy remuxes into .mp4 segments in a single pass (no intermediate file)
  const splitResult = await splitVideo(media.path, chunkSeconds);

  try {
    // Compress only oversized chunks
    const processedChunks = await compressOversizedChunks(splitResult.chunks, noCompress);
    const compressedCount = processedChunks.filter(c => c.compressed).length;

    if (compressedCount > 0) {
      output(`[split] ${compressedCount}/${processedChunks.length} chunks compressed (exceeded 20MB)`);
    }
    output(`[split] ${processedChunks.length} chunks ready. Sending to Gemini...`);

    // Single chunk — no split orchestration needed
    if (processedChunks.length === 1) {
      const chunk = processedChunks[0];
      const chunkMedia: MediaInfo = {
        path: chunk.path,
        mimeType: 'video/mp4',
        sizeBytes: chunk.sizeBytes,
        sizeFormatted: chunk.sizeFormatted,
      };
      const analysis = await analyzeMedia(chunkMedia, options.prompt);
      const result: AnalysisResult = {
        file: originalPath,
        mimeType: media.mimeType,
        size: media.sizeFormatted,
        analysis,
      };
      if (options.verbose) result.rawResponse = analysis;
      output(formatAnalysisResult(result, format));
      return;
    }

    // Multi-chunk: parallel or sequential
    const chunkResults = mode === 'parallel'
      ? await analyzeParallel(processedChunks, options.prompt)
      : await analyzeSequential(processedChunks, options.prompt);

    const splitAnalysis: SplitAnalysisResult = {
      file: originalPath,
      originalSize: splitResult.originalSize,
      chunks: processedChunks.length,
      compressed: compressedCount,
      mode,
      chunkResults,
      rawResponses: options.verbose ? chunkResults.map(r => r.analysis) : undefined,
    };

    output(formatSplitAnalysisResult(splitAnalysis, format));
  } finally {
    cleanupSplit(splitResult.tmpDir);
  }
}

async function runAnalyze(filePaths: string[], options: AnalyzeOptions): Promise<void> {
  const format = getFormat(options.format);
  const conversionDirs: string[] = [];

  try {
    const expandedFiles = await expandGlobs(filePaths);

    if (expandedFiles.length === 0) {
      throw new Error('No files found matching the provided patterns');
    }

    const infoResults = expandedFiles.map(f => getMediaInfo(f));
    const mediaList = infoResults.map(r => r.media);

    // Single large video → auto-split
    if (mediaList.length === 1 && needsAutoSplit(mediaList[0])) {
      await analyzeWithSplit(mediaList[0], expandedFiles[0], options, format);
      return;
    }

    // Small convertible files need conversion before Gemini upload
    for (let i = 0; i < infoResults.length; i++) {
      if (infoResults[i].needsConversion) {
        output(`[convert] Converting ${extname(infoResults[i].originalPath)} to mp4...`);
        const conversion = await convertToMp4(infoResults[i].originalPath);
        conversionDirs.push(conversion.tmpDir);
        const stats = statSync(conversion.convertedPath);
        mediaList[i] = {
          path: conversion.convertedPath,
          mimeType: 'video/mp4',
          sizeBytes: stats.size,
          sizeFormatted: formatSize(stats.size),
        };
      }
    }

    // Check total size for non-split files
    const totalSize = mediaList.reduce((sum, m) => sum + m.sizeBytes, 0);
    if (totalSize > MAX_FILE_SIZE * 2) {
      throw new Error(`Total size too large: ${formatSize(totalSize)} (recommended max ~40MB for multi-file)`);
    }

    if (mediaList.length === 1) {
      const analysis = await analyzeMedia(mediaList[0], options.prompt);
      const result: AnalysisResult = {
        file: expandedFiles[0],
        mimeType: mediaList[0].mimeType,
        size: mediaList[0].sizeFormatted,
        analysis,
      };
      if (options.verbose) result.rawResponse = analysis;
      output(formatAnalysisResult(result, format));
    } else {
      const analysis = await analyzeMultipleMedia(mediaList, options.prompt);
      const result = {
        files: expandedFiles,
        count: expandedFiles.length,
        totalSize: formatSize(totalSize),
        analysis,
        rawResponse: options.verbose ? analysis : undefined,
      };
      output(formatMultiAnalysisResult(result, format));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorOutput(message, format);
  } finally {
    for (const dir of conversionDirs) {
      cleanupSplit(dir);
    }
  }
}

export const analyze = new Command('analyze')
  .description('Analyze visual media (images, videos, GIFs) using Gemini')
  .argument('<files...>', 'Path(s) to media files or glob patterns (e.g., /tmp/*.png)')
  .requiredOption('-p, --prompt <prompt>', 'What to look for in the media')
  .option('-f, --format <format>', 'Output format: compact, json, table', 'compact')
  .option('-v, --verbose', 'Include raw response in output', false)
  .option('--chunk <duration>', 'Chunk duration for video splitting (e.g., 30s, 5m, 15m)', '5m')
  .option('--mode <mode>', 'Split analysis mode: parallel or sequential', 'parallel')
  .option('--no-compress', 'Error instead of compressing oversized chunks')
  .action(async (files: string[], opts: {
    prompt: string;
    format?: string;
    verbose?: boolean;
    chunk?: string;
    mode?: string;
    compress?: boolean;
  }) => {
    await runAnalyze(files, {
      prompt: opts.prompt,
      format: opts.format as OutputFormat | undefined,
      verbose: opts.verbose,
      chunk: opts.chunk,
      mode: opts.mode as SplitMode | undefined,
      noCompress: opts.compress === false,
    });
  });
