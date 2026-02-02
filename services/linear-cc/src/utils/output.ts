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
 * Compact formatters for different Linear data types
 */
interface IssueData {
  identifier?: string;
  id?: string;
  title?: string;
  state?: string;
  assignee?: string | null;
  labels?: string[];
  url?: string;
}

interface CommentData {
  id?: string;
  author?: string;
  createdAt?: string;
  body?: string;
}

interface ProjectData {
  id?: string;
  name?: string;
  state?: string;
  progress?: number;
}

interface DocumentData {
  id?: string;
  title?: string;
  url?: string;
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

function formatIssueCompact(issue: IssueData): string {
  const labels = issue.labels?.length ? issue.labels.join(';') : '-';
  return `${issue.identifier}|${truncate(issue.title || '', 50)}|${v(issue.state)}|${v(issue.assignee)}|${labels}`;
}

function formatCommentCompact(comment: CommentData): string {
  const date = comment.createdAt ? formatDate(comment.createdAt) : '-';
  return `${v(comment.id)}|${v(comment.author)}|${date}|${truncate(comment.body || '', 100)}`;
}

function formatProjectCompact(project: ProjectData): string {
  return `${v(project.id)}|${v(project.name)}|${v(project.state)}`;
}

function formatDocumentCompact(doc: DocumentData): string {
  return `${v(doc.id)}|${v(doc.title)}|${v(doc.url)}`;
}

/**
 * Format success output for mutations (create, update)
 */
export function formatMutationResult(
  action: string,
  data: IssueData | DocumentData | Record<string, unknown>,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ success: true, ...data }, null, 2);
  }

  // TOON compact format for mutations
  if ('identifier' in data && data.identifier) {
    return `${action}:${data.identifier}|${data.title}${data.url ? `|${data.url}` : ''}`;
  }
  if ('title' in data && data.title) {
    return `${action}:${data.id}|${data.title}${data.url ? `|${data.url}` : ''}`;
  }
  return `${action}:${data.id || '-'}`;
}

/**
 * Format single issue output
 */
export function formatIssue(
  issue: IssueData & Record<string, unknown>,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, ...issue }, null, 2);
    case 'table':
      return formatObjectAsTable({ success: true, ...issue });
    case 'compact':
    default:
      return formatIssueCompact(issue);
  }
}

/**
 * Format list of issues
 */
export function formatIssueList(
  issues: IssueData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, count: issues.length, issues }, null, 2);
    case 'table':
      return formatArrayAsTable(issues, ['identifier', 'id', 'title', 'state', 'assignee']);
    case 'compact':
    default:
      return formatToonArray('issues', issues, ['id', 'title', 'state', 'assignee', 'labels'], (issue, field) => {
        switch (field) {
          case 'id': return v(issue.identifier);
          case 'title': return truncate(issue.title || '', 50);
          case 'state': return v(issue.state);
          case 'assignee': return v(issue.assignee);
          case 'labels': return issue.labels?.length ? issue.labels.join(';') : '-';
          default: return '-';
        }
      });
  }
}

/**
 * Format list of comments
 */
export function formatCommentList(
  issueIdentifier: string,
  comments: CommentData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, identifier: issueIdentifier, comments }, null, 2);
    case 'table':
      return `Issue: ${issueIdentifier}\n` + formatArrayAsTable(comments, ['id', 'author', 'createdAt', 'body']);
    case 'compact':
    default:
      return `${issueIdentifier}.` + formatToonArray('comments', comments, ['id', 'author', 'date', 'body'], (c, field) => {
        switch (field) {
          case 'id': return v(c.id);
          case 'author': return v(c.author);
          case 'date': return c.createdAt ? formatDate(c.createdAt) : '-';
          case 'body': return truncate(c.body || '', 100);
          default: return '-';
        }
      });
  }
}

/**
 * Format list of projects
 */
export function formatProjectList(
  projects: ProjectData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, count: projects.length, projects }, null, 2);
    case 'table':
      return formatArrayAsTable(projects, ['id', 'name', 'state']);
    case 'compact':
    default:
      return formatToonArray('projects', projects, ['id', 'name', 'state'], (p, field) => {
        switch (field) {
          case 'id': return v(p.id);
          case 'name': return v(p.name);
          case 'state': return v(p.state);
          default: return '-';
        }
      });
  }
}

/**
 * Format list of documents
 */
export function formatDocumentList(
  documents: DocumentData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, count: documents.length, documents }, null, 2);
    case 'table':
      return formatArrayAsTable(documents, ['id', 'title', 'url']);
    case 'compact':
    default:
      return formatToonArray('docs', documents, ['id', 'title', 'url'], (d, field) => {
        switch (field) {
          case 'id': return v(d.id);
          case 'title': return v(d.title);
          case 'url': return v(d.url);
          default: return '-';
        }
      });
  }
}

/**
 * Format single document
 */
export function formatDocument(
  doc: DocumentData & { content?: string },
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, ...doc }, null, 2);
    case 'table':
      return formatObjectAsTable({ success: true, ...doc });
    case 'compact':
    default:
      return `${doc.id} | ${doc.title}\n${doc.content || '(no content)'}`;
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
 * Error output function - prints to stderr and exits
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

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
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
