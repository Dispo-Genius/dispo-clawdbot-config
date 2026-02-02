export type OutputFormat = 'json' | 'table' | 'compact';

export interface OutputOptions {
  format?: OutputFormat;
}

// Global format setting - default to compact for token efficiency
let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(options: OutputOptions = {}): OutputFormat {
  return options.format || globalFormat;
}

// TOON format helper
function formatToonArray<T>(
  name: string,
  items: T[],
  fields: string[],
  getValue: (item: T, field: string) => string
): string {
  if (items.length === 0) return `${name}[0]{}:`;
  const header = `${name}[${items.length}]{${fields.join('|')}}:`;
  const rows = items.map(item => fields.map(f => getValue(item, f)).join('|'));
  return [header, ...rows].join('\n');
}

function v(val: string | null | undefined): string {
  return val || '-';
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (Array.isArray(val)) return val.join(';');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// Email data interfaces
interface EmailData {
  id?: string;
  threadId?: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  snippet?: string;
  labels?: string[];
}

interface DraftData {
  id?: string;
  to?: string;
  subject?: string;
}

interface ThreadData {
  id?: string;
  subject?: string;
  messageCount?: number;
  snippet?: string;
}

// Format functions

export function formatEmailList(emails: EmailData[], options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ count: emails.length, emails }, null, 2);
  }

  return formatToonArray('emails', emails, ['id', 'from', 'subject', 'date'], (e, field) => {
    switch (field) {
      case 'id': return v(e.id);
      case 'from': return v(e.from);
      case 'subject': return truncate(e.subject || '', 50);
      case 'date': return v(e.date);
      default: return '-';
    }
  });
}

export function formatEmail(email: EmailData & { body?: string }, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify(email, null, 2);
  }

  const header = `email:${v(email.id)}|${v(email.from)}|${v(email.to)}|${truncate(email.subject || '', 50)}|${v(email.date)}`;
  if (email.body) {
    return header + '\n' + truncate(email.body, 500);
  }
  return header;
}

export function formatDraftList(drafts: DraftData[], options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ count: drafts.length, drafts }, null, 2);
  }

  return formatToonArray('drafts', drafts, ['id', 'to', 'subject'], (d, field) => {
    switch (field) {
      case 'id': return v(d.id);
      case 'to': return v(d.to);
      case 'subject': return truncate(d.subject || '', 50);
      default: return '-';
    }
  });
}

export function formatThreadList(threads: ThreadData[], options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ count: threads.length, threads }, null, 2);
  }

  return formatToonArray('threads', threads, ['id', 'subject', 'count', 'snippet'], (t, field) => {
    switch (field) {
      case 'id': return v(t.id);
      case 'subject': return truncate(t.subject || '', 40);
      case 'count': return String(t.messageCount || 0);
      case 'snippet': return truncate(t.snippet || '', 50);
      default: return '-';
    }
  });
}

export function formatMutationResult(action: string, data: Record<string, unknown>, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ success: true, action, ...data }, null, 2);
  }

  const parts = Object.entries(data)
    .filter(([, val]) => val !== null && val !== undefined)
    .slice(0, 3)
    .map(([k, val]) => `${k}:${formatValue(val)}`);
  return `${action}:${parts.join('|')}`;
}

export function formatOutput(data: unknown, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  // For unknown data, try to format as TOON if array
  if (Array.isArray(data)) {
    if (data.length === 0) return 'items[0]{}:';
    const first = data[0];
    if (typeof first === 'object' && first !== null) {
      const keys = Object.keys(first).slice(0, 5);
      return formatToonArray('items', data as Record<string, unknown>[], keys, (item, field) => {
        return formatValue((item as Record<string, unknown>)[field]);
      });
    }
    return data.map(String).join('\n');
  }

  if (typeof data === 'object' && data !== null) {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, val]) => `${k}:${formatValue(val)}`)
      .join('|');
  }

  return String(data);
}

export function output(data: unknown, options: OutputOptions = {}): void {
  const formatted = formatOutput(data, options);
  if (formatted) {
    console.log(formatted);
  }
}

export function errorOutput(message: string, details?: unknown): void {
  console.error(`error:${message}`);
  if (details && process.env.DEBUG) {
    console.error('details:', details);
  }
  process.exit(1);
}
