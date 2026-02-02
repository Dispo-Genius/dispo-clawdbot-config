import { Command } from 'commander';
import { statSync } from 'fs';
import { extname } from 'path';
import { analyzeMedia, analyzeMultipleMedia, createGenerationPrompt, generateWithConfig } from '../api/gemini';
import { ImageConfig, MAX_FILE_SIZE, MediaInfo, OutputFormat } from '../types';
import { formatGenerateResult, GenerateAnalysisResult, errorOutput, output, getFormat } from '../utils/output';
import { splitVideo, compressOversizedChunks, cleanupSplit, parseDuration, convertToMp4 } from '../utils/video';
import { formatSize, getMediaInfo, needsAutoSplit, expandGlobs } from '../utils/media';

async function runGenerate(filePaths: string[], opts: {
  prompt: string;
  output: string;
  aspectRatio?: string;
  imageSize?: string;
  analyze: boolean;
  chunk?: string;
  compress: boolean;
  format?: string;
  verbose?: boolean;
}): Promise<void> {
  const format = getFormat(opts.format as OutputFormat | undefined);
  const conversionDirs: string[] = [];

  try {
    const expandedFiles = await expandGlobs(filePaths);

    if (expandedFiles.length === 0) {
      throw new Error('No files found matching the provided patterns');
    }

    const infoResults = expandedFiles.map(f => getMediaInfo(f));
    const mediaList = infoResults.map(r => r.media);

    // Convert non-native formats
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

    // Step 1: Analyze media (optional)
    let analysisContext: string | undefined;
    let splitContext: SplitAnalysisContext | undefined;

    if (opts.analyze) {
      // Single large video → split + sequential analysis for context
      if (mediaList.length === 1 && needsAutoSplit(mediaList[0])) {
        splitContext = await analyzeWithSplitForContext(mediaList[0], opts.chunk, !opts.compress);
        analysisContext = splitContext.context;
      } else if (mediaList.length === 1) {
        output('[generate] Analyzing media...');
        analysisContext = await analyzeMedia(mediaList[0], 'Describe what you see in detail. Focus on spatial layout, dimensions, objects, and features.');
      } else {
        output(`[generate] Analyzing ${mediaList.length} files...`);
        analysisContext = await analyzeMultipleMedia(mediaList, 'Describe what you see in detail. Focus on spatial layout, dimensions, objects, and features.');
      }

      if (opts.verbose && analysisContext) {
        output(`[generate] Analysis context:\n${analysisContext}`);
      }
    }

    try {
      // Step 2: Create optimized prompt
      output('[generate] Creating optimized generation prompt...');
      const craftedPrompt = await createGenerationPrompt(opts.prompt, analysisContext);

      if (opts.verbose) {
        output(`[generate] Crafted prompt:\n${craftedPrompt}`);
      }

      // Step 3: Generate image
      output('[generate] Generating image...');
      const imageConfig: ImageConfig = {};
      if (opts.aspectRatio) imageConfig.aspectRatio = opts.aspectRatio;
      if (opts.imageSize) imageConfig.imageSize = opts.imageSize;

      // For split videos, use last chunk (fits in memory); otherwise use original
      const sourceMedia = splitContext?.lastChunkMedia ?? mediaList[0];
      const generateResult = await generateWithConfig(
        sourceMedia,
        craftedPrompt,
        opts.output,
        Object.keys(imageConfig).length > 0 ? imageConfig : undefined,
      );

      const result: GenerateAnalysisResult = {
        file: expandedFiles[0],
        mimeType: mediaList[0].mimeType,
        size: mediaList[0].sizeFormatted,
        text: generateResult.text,
        imagePaths: generateResult.imagePaths,
      };
      output(formatGenerateResult(result, format));
    } finally {
      // Clean up split tmp dir after generation is done
      if (splitContext?.tmpDir) {
        cleanupSplit(splitContext.tmpDir);
      }
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

interface SplitAnalysisContext {
  context: string;
  lastChunkMedia: MediaInfo;
  tmpDir: string;
}

async function analyzeWithSplitForContext(
  media: MediaInfo,
  chunk?: string,
  noCompress?: boolean,
): Promise<SplitAnalysisContext> {
  const chunkSeconds = parseDuration(chunk || '5m');

  output(`[generate] Video ${media.sizeFormatted} exceeds 20MB. Splitting for sequential analysis...`);
  const splitResult = await splitVideo(media.path, chunkSeconds);

  const processedChunks = await compressOversizedChunks(splitResult.chunks, noCompress || false);
  const compressedCount = processedChunks.filter(c => c.compressed).length;

  if (compressedCount > 0) {
    output(`[generate] ${compressedCount}/${processedChunks.length} chunks compressed`);
  }

  let accumulatedSummary = '';

  for (let i = 0; i < processedChunks.length; i++) {
    const chunkData = processedChunks[i];
    const chunkMedia: MediaInfo = {
      path: chunkData.path,
      mimeType: 'video/mp4',
      sizeBytes: chunkData.sizeBytes,
      sizeFormatted: chunkData.sizeFormatted,
    };

    output(`[generate] Analyzing chunk ${i + 1}/${processedChunks.length}...`);

    let chunkPrompt = '';
    if (accumulatedSummary) {
      chunkPrompt += `[Prior analysis summary]\n${accumulatedSummary}\n\n`;
    }
    chunkPrompt += `[Part ${i + 1} of ${processedChunks.length}]\n\nDescribe what you see in detail. Focus on spatial layout, dimensions, objects, and features.`;

    const analysis = await analyzeMedia(chunkMedia, chunkPrompt);
    const summaryLines = analysis.split('\n').slice(0, 15).join('\n');
    accumulatedSummary += (accumulatedSummary ? '\n\n' : '') + `[Part ${i + 1}]: ${summaryLines}`;
  }

  const lastChunk = processedChunks[processedChunks.length - 1];
  return {
    context: accumulatedSummary,
    lastChunkMedia: {
      path: lastChunk.path,
      mimeType: 'video/mp4',
      sizeBytes: lastChunk.sizeBytes,
      sizeFormatted: lastChunk.sizeFormatted,
    },
    tmpDir: splitResult.tmpDir,
  };
}

export const generate = new Command('generate')
  .description('Generate images from media using a two-step Gemini pipeline (analyze → optimize prompt → generate)')
  .argument('<files...>', 'Path(s) to media files or glob patterns')
  .requiredOption('-p, --prompt <prompt>', 'Description of what to generate')
  .requiredOption('-o, --output <dir>', 'Output directory for generated images')
  .option('--aspect-ratio <ratio>', 'Aspect ratio for generated image (e.g., 16:9, 1:1, 9:16)')
  .option('--image-size <size>', 'Image size for generated image (e.g., 1024x1024)')
  .option('--no-analyze', 'Skip analysis step, go straight to prompt creation')
  .option('--chunk <duration>', 'Chunk duration for large video splitting (e.g., 30s, 5m, 15m)', '5m')
  .option('--no-compress', 'Error instead of compressing oversized video chunks')
  .option('-f, --format <format>', 'Output format: compact, json, table', 'compact')
  .option('-v, --verbose', 'Show intermediate prompt and analysis', false)
  .action(async (files: string[], opts: {
    prompt: string;
    output: string;
    aspectRatio?: string;
    imageSize?: string;
    analyze: boolean;
    chunk?: string;
    compress: boolean;
    format?: string;
    verbose?: boolean;
  }) => {
    await runGenerate(files, opts);
  });
