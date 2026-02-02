export type OutputFormat = 'json' | 'text' | 'compact';

let globalFormat: OutputFormat = 'text';

export function setGlobalFormat(format: OutputFormat) {
  globalFormat = format;
}

export function getGlobalFormat(): OutputFormat {
  return globalFormat;
}

export function formatOutput(data: unknown): string {
  switch (globalFormat) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'compact':
      return JSON.stringify(data);
    case 'text':
    default:
      if (typeof data === 'string') {
        return data;
      }
      if (typeof data === 'object' && data !== null && 'text' in data) {
        return String((data as { text: string }).text);
      }
      return JSON.stringify(data, null, 2);
  }
}
