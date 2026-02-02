import { OutputFormat, AnalysisResult, GenerateResult } from '../types';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(format?: OutputFormat): OutputFormat {
  return format || globalFormat;
}

export function formatAnalysisResult(result: AnalysisResult, format?: OutputFormat): string {
  const f = getFormat(format);

  switch (f) {
    case 'json':
      return JSON.stringify(result, null, 2);

    case 'table': {
      const lines = [
        `File:      ${result.file}`,
        `MIME Type: ${result.mimeType}`,
        `Size:      ${result.size}`,
        ``,
        `Analysis:`,
        `─────────`,
        result.analysis,
      ];
      if (result.rawResponse) {
        lines.push(``, `Raw Response:`, `─────────────`, result.rawResponse);
      }
      return lines.join('\n');
    }

    case 'compact':
    default: {
      const header = `analyze:${result.file}|${result.mimeType}|${result.size}`;
      const separator = '---';
      const lines = [header, separator, result.analysis];
      if (result.rawResponse) {
        lines.push(``, `[raw]`, result.rawResponse);
      }
      return lines.join('\n');
    }
  }
}

interface MultiAnalysisResult {
  files: string[];
  count: number;
  totalSize: string;
  analysis: string;
  rawResponse?: string;
}

export function formatMultiAnalysisResult(result: MultiAnalysisResult, format?: OutputFormat): string {
  const f = getFormat(format);

  switch (f) {
    case 'json':
      return JSON.stringify(result, null, 2);

    case 'table': {
      const lines = [
        `Files (${result.count}):`,
        ...result.files.map(f => `  - ${f}`),
        `Total Size: ${result.totalSize}`,
        ``,
        `Analysis:`,
        `─────────`,
        result.analysis,
      ];
      if (result.rawResponse) {
        lines.push(``, `Raw Response:`, `─────────────`, result.rawResponse);
      }
      return lines.join('\n');
    }

    case 'compact':
    default: {
      const header = `analyze:${result.count} files|${result.totalSize}`;
      const fileList = result.files.map(f => f.split('/').pop()).join(', ');
      const separator = '---';
      const lines = [header, `files:${fileList}`, separator, result.analysis];
      if (result.rawResponse) {
        lines.push(``, `[raw]`, result.rawResponse);
      }
      return lines.join('\n');
    }
  }
}

export interface SplitAnalysisResult {
  file: string;
  originalSize: string;
  chunks: number;
  compressed: number;
  mode: string;
  chunkResults: { part: number; analysis: string }[];
  rawResponses?: string[];
}

export function formatSplitAnalysisResult(result: SplitAnalysisResult, format?: OutputFormat): string {
  const f = getFormat(format);

  switch (f) {
    case 'json':
      return JSON.stringify(result, null, 2);

    case 'table': {
      const lines = [
        `File:       ${result.file}`,
        `Original:   ${result.originalSize}`,
        `Chunks:     ${result.chunks} (${result.compressed} compressed)`,
        `Mode:       ${result.mode}`,
      ];
      for (const cr of result.chunkResults) {
        lines.push(``, `Part ${cr.part}:`, `─────────`, cr.analysis);
      }
      if (result.rawResponses) {
        lines.push(``, `Raw Responses:`, `──────────────`);
        result.rawResponses.forEach((r, i) => lines.push(`[Part ${i + 1}]`, r, ``));
      }
      return lines.join('\n');
    }

    case 'compact':
    default: {
      const header = `analyze:${result.file}|split:${result.chunks} parts|${result.originalSize}|mode:${result.mode}`;
      const lines = [header, '---'];
      for (const cr of result.chunkResults) {
        lines.push(`[Part ${cr.part}/${result.chunks}]`, cr.analysis, ``);
      }
      if (result.rawResponses) {
        lines.push(`[raw]`);
        result.rawResponses.forEach((r, i) => lines.push(`[Part ${i + 1}]`, r, ``));
      }
      return lines.join('\n');
    }
  }
}

export interface GenerateAnalysisResult {
  file: string;
  mimeType: string;
  size: string;
  text: string;
  imagePaths: string[];
}

export function formatGenerateResult(result: GenerateAnalysisResult, format?: OutputFormat): string {
  const f = getFormat(format);

  switch (f) {
    case 'json':
      return JSON.stringify(result, null, 2);

    case 'table': {
      const lines = [
        `File:      ${result.file}`,
        `MIME Type: ${result.mimeType}`,
        `Size:      ${result.size}`,
        ``,
        `Analysis:`,
        `─────────`,
        result.text,
      ];
      if (result.imagePaths.length > 0) {
        lines.push(``, `Generated Images:`);
        for (const p of result.imagePaths) {
          lines.push(`  ${p}`);
        }
      }
      return lines.join('\n');
    }

    case 'compact':
    default: {
      const header = `generate:${result.file}|${result.mimeType}|${result.size}`;
      const separator = '---';
      const lines = [header, separator, result.text];
      if (result.imagePaths.length > 0) {
        lines.push(``);
        for (const p of result.imagePaths) {
          lines.push(`[image] ${p}`);
        }
      }
      return lines.join('\n');
    }
  }
}

export function formatError(error: string, format?: OutputFormat): string {
  const f = getFormat(format);

  if (f === 'json') {
    return JSON.stringify({ success: false, error }, null, 2);
  }
  return `error:${error}`;
}

export function output(data: string): void {
  console.log(data);
}

export function errorOutput(error: string, format?: OutputFormat): void {
  console.log(formatError(error, format));
  process.exit(1);
}
