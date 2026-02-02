export type OutputFormat = 'json' | 'table' | 'compact';
export type SplitMode = 'parallel' | 'sequential';

export interface AnalyzeOptions {
  prompt: string;
  format?: OutputFormat;
  verbose?: boolean;
  chunk?: string;
  mode?: SplitMode;
  noCompress?: boolean;
}

export interface AnalysisResult {
  file: string;
  mimeType: string;
  size: string;
  analysis: string;
  rawResponse?: string;
}

export interface MediaInfo {
  path: string;
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface GenerateResult {
  text: string;
  imagePaths: string[];
}

export interface ImageConfig {
  aspectRatio?: string;
  imageSize?: string;
  personGeneration?: string;
}

export interface GenerateCommandOptions {
  prompt: string;
  outputDir: string;
  aspectRatio?: string;
  imageSize?: string;
  noAnalyze?: boolean;
  format?: OutputFormat;
  verbose?: boolean;
  chunk?: string;
  noCompress?: boolean;
}

export interface ChunkInfo {
  path: string;
  index: number;
  totalChunks: number;
  sizeBytes: number;
  sizeFormatted: string;
  compressed: boolean;
}

export interface SplitResult {
  chunks: ChunkInfo[];
  tmpDir: string;
  originalSize: string;
  duration: number;
  chunkDuration: number;
}

export const SUPPORTED_FORMATS: Record<string, string> = {
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export const CONVERTIBLE_FORMATS: Record<string, string> = {
  '.mov': 'video/mp4',
  '.avi': 'video/mp4',
  '.mkv': 'video/mp4',
  '.flv': 'video/mp4',
  '.wmv': 'video/mp4',
  '.m4v': 'video/mp4',
  '.3gp': 'video/mp4',
  '.ts': 'video/mp4',
};

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
