export type OutputFormat = 'json' | 'table' | 'compact';

export interface OutputOptions {
  format?: OutputFormat;
}

// Global format setting (set by index.ts from CLI flag)
let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(options: OutputOptions = {}): OutputFormat {
  return options.format || globalFormat;
}

/**
 * Compact formatters for different Slack data types
 */
interface ChannelData {
  name?: string;
  id?: string;
  isPrivate?: boolean;
}

interface MessageData {
  user?: string;
  userId?: string;
  text?: string;
  ts?: string;
  isThreadReply?: boolean;
}

interface MemberData {
  name?: string;
  id?: string;
  displayName?: string;
  realName?: string;
}

interface SendMessageResult {
  channel?: string;
  channelId?: string;
  messageTs?: string;
  permalink?: string;
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

function formatChannelCompact(channel: ChannelData): string {
  const priv = channel.isPrivate ? 'priv' : 'pub';
  return `${v(channel.name)}|${v(channel.id)}|${priv}`;
}

function formatMessageCompact(message: MessageData): string {
  const reply = message.isThreadReply ? 'reply' : '-';
  return `${v(message.ts)}|${v(message.user || message.userId)}|${truncate(message.text || '', 100)}|${reply}`;
}

function formatMemberCompact(member: MemberData): string {
  const display = member.displayName || member.realName || member.name || '-';
  return `${v(member.name)}|${v(member.id)}|${display}`;
}

/**
 * Format success output for sent messages
 */
export function formatSendResult(
  data: SendMessageResult,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ success: true, ...data }, null, 2);
  }

  // TOON compact format
  return `sent:${v(data.channel)}|${v(data.messageTs)}|${v(data.permalink)}`;
}

/**
 * Format list of channels
 */
export function formatChannelList(
  channels: ChannelData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, count: channels.length, channels }, null, 2);
    case 'table':
      return formatArrayAsTable(channels, ['name', 'id', 'isPrivate']);
    case 'compact':
    default:
      return formatToonArray('channels', channels, ['name', 'id', 'private'], (ch, field) => {
        switch (field) {
          case 'name': return v(ch.name);
          case 'id': return v(ch.id);
          case 'private': return ch.isPrivate ? 'priv' : 'pub';
          default: return '-';
        }
      });
  }
}

/**
 * Format message history
 */
export function formatMessageList(
  channel: string,
  channelId: string,
  messages: MessageData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, channel, channelId, count: messages.length, messages }, null, 2);
    case 'table':
      return `Channel: #${channel}\n` + formatArrayAsTable(messages, ['ts', 'user', 'text']);
    case 'compact':
    default:
      return `${channel}.` + formatToonArray('messages', messages, ['ts', 'user', 'text', 'reply'], (m, field) => {
        switch (field) {
          case 'ts': return v(m.ts);
          case 'user': return v(m.user || m.userId);
          case 'text': return truncate(m.text || '', 100);
          case 'reply': return m.isThreadReply ? 'reply' : '-';
          default: return '-';
        }
      });
  }
}

/**
 * Format list of members
 */
export function formatMemberList(
  members: MemberData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, count: members.length, members }, null, 2);
    case 'table':
      return formatArrayAsTable(members, ['name', 'id', 'displayName']);
    case 'compact':
    default:
      return formatToonArray('members', members, ['name', 'id', 'display'], (m, field) => {
        switch (field) {
          case 'name': return v(m.name);
          case 'id': return v(m.id);
          case 'display': return m.displayName || m.realName || m.name || '-';
          default: return '-';
        }
      });
  }
}

/**
 * Format error output
 */
export function formatError(error: string, options: OutputOptions = {}): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ success: false, error }, null, 2);
  }
  return `error:${error}`;
}

/**
 * Format generic success with custom data
 */
export function formatSuccess(
  data: Record<string, unknown>,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ success: true, ...data }, null, 2);
  }
  if (format === 'table') {
    return formatObjectAsTable({ success: true, ...data });
  }
  // TOON compact: pipe-separated key:value pairs
  return Object.entries(data)
    .map(([k, val]) => `${k}:${formatValue(val)}`)
    .join('|');
}

/**
 * Main output function - prints to stdout
 */
export function output(data: string): void {
  console.log(data);
}

/**
 * Error output function - prints and exits
 */
export function errorOutput(error: string, options: OutputOptions = {}): void {
  console.log(formatError(error, options));
  process.exit(1);
}

// Helper functions

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (Array.isArray(v)) return v.join(',');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function formatArrayAsTable(arr: unknown[], columns?: string[]): string {
  if (arr.length === 0) return 'No results';

  const first = arr[0];
  if (typeof first !== 'object' || first === null) {
    return arr.map(String).join('\n');
  }

  const records = arr as Record<string, unknown>[];
  const keys = columns || Object.keys(first);

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const key of keys) {
    widths[key] = Math.max(
      key.length,
      ...records.map((r) => truncate(formatValue(r[key]), 50).length)
    );
  }

  // Header
  const header = keys.map((k) => k.padEnd(widths[k])).join(' | ');
  const separator = keys.map((k) => '-'.repeat(widths[k])).join('-+-');

  // Rows
  const rows = records.map((r) =>
    keys.map((k) => truncate(formatValue(r[k]), 50).padEnd(widths[k])).join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

function formatObjectAsTable(obj: Record<string, unknown>): string {
  const maxKeyLen = Math.max(...Object.keys(obj).map((k) => k.length));

  return Object.entries(obj)
    .map(([k, v]) => `${k.padEnd(maxKeyLen)} : ${formatValue(v)}`)
    .join('\n');
}
