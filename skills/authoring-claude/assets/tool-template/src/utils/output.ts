import type { OutputFormat, StatusResult, Item } from '../types';

// Global format setting
let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(): OutputFormat {
  return globalFormat;
}

// TOON format helpers

function escapeField(val: string): string {
  if (val.includes(',') || val.includes('"')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// Format array with TOON header
export function formatArray<T>(
  name: string,
  items: T[],
  fields: (keyof T)[]
): string {
  if (getFormat() === 'json') {
    return JSON.stringify(items, null, 2);
  }

  const header = `${name}[${items.length}]{${fields.join(',')}}:`;
  const rows = items.map(item =>
    fields.map(f => escapeField(String(item[f]))).join(',')
  );
  return [header, ...rows].join('\n');
}

// Status formatter
export function formatStatus(result: StatusResult): string {
  if (getFormat() === 'json') {
    return JSON.stringify(result, null, 2);
  }
  return `status:${result.status}${result.message ? `,${result.message}` : ''}`;
}

// Generic output
export function output(data: string): void {
  console.log(data);
}

export function formatError(error: string): string {
  if (getFormat() === 'json') {
    return JSON.stringify({ success: false, error }, null, 2);
  }
  return `error:${error}`;
}

export function errorOutput(error: string): never {
  console.log(formatError(error));
  process.exit(1);
}

export function formatSuccess(action: string, message?: string): string {
  if (getFormat() === 'json') {
    return JSON.stringify({ success: true, action, message }, null, 2);
  }
  return message ? `${action}:${message}` : `${action}:ok`;
}
