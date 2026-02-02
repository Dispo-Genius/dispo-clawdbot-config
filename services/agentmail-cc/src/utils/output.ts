export type OutputFormat = 'json' | 'table' | 'compact';

export interface OutputOptions {
  format?: OutputFormat;
}

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(options: OutputOptions = {}): OutputFormat {
  return options.format || globalFormat;
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

export function formatInboxList(inboxes: Array<{ inboxId?: string; displayName?: string; domain?: string }>, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ count: inboxes.length, inboxes }, null, 2);
  }

  return formatToonArray('inboxes', inboxes, ['id', 'displayName', 'domain'], (inbox, field) => {
    switch (field) {
      case 'id': return v(inbox.inboxId);
      case 'displayName': return v(inbox.displayName);
      case 'domain': return v(inbox.domain);
      default: return '-';
    }
  });
}

export function formatInbox(inbox: Record<string, unknown>, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify(inbox, null, 2);
  }

  return `inbox:${v(inbox.inboxId as string)}|${v(inbox.displayName as string)}|${v(inbox.domain as string)}`;
}

export function formatMessageList(messages: Array<{ messageId?: string; from?: string; subject?: string; createdAt?: string }>, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ count: messages.length, messages }, null, 2);
  }

  return formatToonArray('messages', messages, ['id', 'from', 'subject', 'date'], (msg, field) => {
    switch (field) {
      case 'id': return v(msg.messageId);
      case 'from': return v(msg.from);
      case 'subject': return truncate(msg.subject || '', 50);
      case 'date': return v(msg.createdAt);
      default: return '-';
    }
  });
}

export function formatMessage(message: Record<string, unknown>, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify(message, null, 2);
  }

  const header = `message:${v(message.messageId as string)}|${v(message.from as string)}|${v(message.to as string)}|${truncate((message.subject as string) || '', 50)}`;
  const body = (message.text as string) || (message.html as string) || '';
  if (body) {
    return header + '\n' + truncate(body, 500);
  }
  return header;
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
