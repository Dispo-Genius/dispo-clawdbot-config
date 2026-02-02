import type { OutputFormat, SessionData, MessageData } from '../types';

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

function v(val: string | number | null | undefined): string {
  if (val == null) return '-';
  return String(val);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

// Format array with TOON header
function formatArray<T>(
  name: string,
  items: T[],
  fields: string[],
  getValue: (item: T, field: string) => string
): string {
  if (getFormat() === 'json') {
    return JSON.stringify(items, null, 2);
  }
  const header = `${name}[${items.length}]{${fields.join(',')}}:`;
  if (items.length === 0) return header;
  const rows = items.map(item =>
    fields.map(f => escapeField(getValue(item, f))).join(',')
  );
  return [header, ...rows].join('\n');
}

// Standard output
export function output(data: string): void {
  console.log(data);
}

// Error with exit
export function errorOutput(error: string): never {
  if (getFormat() === 'json') {
    console.log(JSON.stringify({ success: false, error }, null, 2));
  } else {
    console.log(`error:${error}`);
  }
  process.exit(1);
}

// Format agent response (send/send-image)
export function formatAgentResponse(response: string): string {
  if (getFormat() === 'json') {
    return JSON.stringify({ success: true, response }, null, 2);
  }
  return response;
}

// Format status result
export function formatStatus(data: Record<string, unknown>): string {
  if (getFormat() === 'json') {
    return JSON.stringify({ success: true, ...data }, null, 2);
  }
  return Object.entries(data)
    .map(([k, val]) => {
      if (val === null || val === undefined) return `${k}:-`;
      if (typeof val === 'object') return `${k}:${JSON.stringify(val)}`;
      return `${k}:${val}`;
    })
    .join(',');
}

// Format session list
export function formatSessionList(sessions: SessionData[]): string {
  return formatArray('sessions', sessions, ['id', 'recipient', 'channel', 'updated', 'msgs'], (s, field) => {
    switch (field) {
      case 'id': return v(s.id);
      case 'recipient': return v(s.recipient);
      case 'channel': return v(s.channel);
      case 'updated': return v(s.updatedAt);
      case 'msgs': return s.messageCount != null ? String(s.messageCount) : '-';
      default: return '-';
    }
  });
}

// Format message list
export function formatMessageList(messages: MessageData[]): string {
  return formatArray('messages', messages, ['role', 'time', 'channel', 'content'], (m, field) => {
    switch (field) {
      case 'role': return v(m.role);
      case 'time': return v(m.timestamp);
      case 'channel': return v(m.channel);
      case 'content': return truncate(m.content || '', 120);
      default: return '-';
    }
  });
}
