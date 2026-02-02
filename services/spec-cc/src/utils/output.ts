export type OutputFormat = 'json' | 'table' | 'compact';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(): OutputFormat {
  return globalFormat;
}

export function output(data: string): void {
  console.log(data);
}

export function errorOutput(error: string): never {
  const format = getFormat();
  if (format === 'json') {
    console.log(JSON.stringify({ success: false, error }, null, 2));
  } else {
    console.log(`error:${error}`);
  }
  process.exit(1);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function v(val: string | null | undefined): string {
  return val || '-';
}

export interface SpecData {
  slug: string;
  status: string;
  linearId: string | null;
  lineCount: number;
  sessionCount: number;
  referenceCount: number;
  references: string[];
  path: string;
  title: string;
  isFolder: boolean;
}

export function formatSpecList(specs: SpecData[]): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ success: true, count: specs.length, specs }, null, 2);
  }

  if (specs.length === 0) return 'specs[0]{}:';

  // Compact TOON format
  const header = `specs[${specs.length}]{slug|status|linear|lines|sessions|refs}:`;
  const rows = specs.map(s =>
    `${s.slug}|${s.status}|${v(s.linearId)}|${s.lineCount}|${s.sessionCount}|${s.referenceCount}`
  );
  return [header, ...rows].join('\n');
}

export function formatSpecInfo(spec: SpecData & { content?: string }): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ success: true, ...spec }, null, 2);
  }

  // Compact format
  const lines = [
    `slug:${spec.slug}`,
    `status:${spec.status}`,
    `linear:${v(spec.linearId)}`,
    `lines:${spec.lineCount}`,
    `sessions:${spec.sessionCount}`,
    `refs:${spec.referenceCount}`,
    `references:${spec.references.length > 0 ? spec.references.join(',') : '-'}`,
    `path:${spec.path}`,
    `folder:${spec.isFolder}`,
  ];
  return lines.join('\n');
}

export function formatSuccess(message: string, data?: Record<string, unknown>): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ success: true, message, ...data }, null, 2);
  }

  if (data) {
    return `${message}|${Object.entries(data).map(([k, v]) => `${k}:${v}`).join('|')}`;
  }
  return message;
}
