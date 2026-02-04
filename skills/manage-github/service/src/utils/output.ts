import type {
  OutputFormat,
  PullRequest,
  PullRequestList,
  Issue,
  IssueList,
  ChecksResult,
  Comment,
  GitStatus,
  DiffStats,
  ConflictFile,
  RebaseResult,
} from '../types';

// Global format setting (set by index.ts from CLI flag)
let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(): OutputFormat {
  return globalFormat;
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

function formatReviewStatus(decision: string | null): string {
  if (!decision) return '-';
  const map: Record<string, string> = {
    APPROVED: 'APPROVED',
    CHANGES_REQUESTED: 'CHANGES_REQ',
    REVIEW_REQUIRED: 'PENDING',
  };
  return map[decision] || decision;
}

function formatChecksStatus(status: string | null): string {
  if (!status) return '-';
  const map: Record<string, string> = {
    SUCCESS: 'pass',
    FAILURE: 'fail',
    PENDING: 'pending',
    ERROR: 'error',
  };
  return map[status] || status.toLowerCase();
}

function formatMergeStatus(mergeable: string | undefined): string {
  if (!mergeable) return '-';
  const map: Record<string, string> = {
    MERGEABLE: 'ok',
    CONFLICTING: 'conflict',
    UNKNOWN: '?',
  };
  return map[mergeable] || mergeable.toLowerCase();
}

// TOON format helpers

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

// Compact formatters (TOON format)

function formatPRCompact(pr: PullRequest): string {
  const review = formatReviewStatus(pr.reviewDecision);
  const checks = formatChecksStatus(pr.checksStatus);
  const merge = formatMergeStatus(pr.mergeable);
  return `pr:${pr.number}|${pr.state}|${review}/${checks}|${merge}|${pr.author}→${pr.base}`;
}

function formatPRListCompact(prs: PullRequestList[]): string {
  return formatToonArray('prs', prs, ['num', 'title', 'author', 'review', 'checks', 'merge', 'date'], (pr, field) => {
    switch (field) {
      case 'num': return String(pr.number);
      case 'title': return truncate(pr.title, 40);
      case 'author': return pr.author;
      case 'review': return formatReviewStatus(pr.reviewDecision);
      case 'checks': return formatChecksStatus(pr.checksStatus);
      case 'merge': return formatMergeStatus(pr.mergeable);
      case 'date': return formatDate(pr.updatedAt);
      default: return '-';
    }
  });
}

function formatIssueCompact(issue: Issue): string {
  const assignees = issue.assignees.length > 0 ? issue.assignees.join(';') : '-';
  const labels = issue.labels.length > 0 ? issue.labels.join(';') : '-';
  return `issue:${issue.number}|${issue.state}|${truncate(issue.title, 50)}|${issue.author}|${assignees}|${labels}`;
}

function formatIssueListCompact(issues: IssueList[]): string {
  return formatToonArray('issues', issues, ['num', 'title', 'state', 'author', 'date', 'labels'], (issue, field) => {
    switch (field) {
      case 'num': return String(issue.number);
      case 'title': return truncate(issue.title, 40);
      case 'state': return issue.state;
      case 'author': return issue.author;
      case 'date': return formatDate(issue.updatedAt);
      case 'labels': return issue.labels.length > 0 ? issue.labels.join(';') : '-';
      default: return '-';
    }
  });
}

function formatChecksCompact(result: ChecksResult): string {
  const header = `checks[${result.checks.length}]{name|result}:#${result.prNumber} ${result.passing}/${result.total}pass`;
  const rows = result.checks.map(c => `${c.name}|${c.conclusion || c.status}`);
  return [header, ...rows].join('\n');
}

function formatCommentsCompact(comments: Comment[]): string {
  return formatToonArray('comments', comments, ['id', 'author', 'date', 'body'], (c, field) => {
    switch (field) {
      case 'id': return c.id;
      case 'author': return c.author;
      case 'date': return formatDate(c.createdAt);
      case 'body': return truncate(c.body.replace(/\n/g, ' '), 80);
      default: return '-';
    }
  });
}

// Table formatters

function formatArrayAsTable<T>(
  arr: T[],
  columns: (keyof T)[]
): string {
  if (arr.length === 0) return 'No results';

  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col as string] = Math.max(
      String(col).length,
      ...arr.map((r) => truncate(String((r as Record<string, unknown>)[col as string] ?? '-'), 50).length)
    );
  }

  const header = columns.map((c) => String(c).padEnd(widths[c as string])).join(' | ');
  const separator = columns.map((c) => '-'.repeat(widths[c as string])).join('-+-');
  const rows = arr.map((r) =>
    columns.map((c) => truncate(String((r as Record<string, unknown>)[c as string] ?? '-'), 50).padEnd(widths[c as string])).join(' | ')
  );

  return [header, separator, ...rows].join('\n');
}

// Public format functions

export function formatPR(pr: PullRequest): string {
  const format = getFormat();

  switch (format) {
    case 'json':
      return JSON.stringify(pr, null, 2);
    case 'table':
      return formatArrayAsTable([pr], ['number', 'title', 'state', 'author', 'reviewDecision', 'checksStatus', 'mergeable']);
    case 'compact':
    default:
      return formatPRCompact(pr);
  }
}

export function formatPRList(prs: PullRequestList[]): string {
  const format = getFormat();

  switch (format) {
    case 'json':
      return JSON.stringify({ count: prs.length, prs }, null, 2);
    case 'table':
      return formatArrayAsTable(prs, ['number', 'title', 'author', 'reviewDecision', 'checksStatus', 'mergeable', 'updatedAt']);
    case 'compact':
    default:
      if (prs.length === 0) return 'prs[0]{}:';
      return formatPRListCompact(prs);
  }
}

export function formatIssue(issue: Issue): string {
  const format = getFormat();

  switch (format) {
    case 'json':
      return JSON.stringify(issue, null, 2);
    case 'table':
      return formatArrayAsTable([issue], ['number', 'title', 'state', 'author', 'assignees']);
    case 'compact':
    default:
      return formatIssueCompact(issue);
  }
}

export function formatIssueList(issues: IssueList[]): string {
  const format = getFormat();

  switch (format) {
    case 'json':
      return JSON.stringify({ count: issues.length, issues }, null, 2);
    case 'table':
      return formatArrayAsTable(issues, ['number', 'title', 'state', 'author', 'updatedAt']);
    case 'compact':
    default:
      if (issues.length === 0) return 'issues[0]{}:';
      return formatIssueListCompact(issues);
  }
}

export function formatChecks(result: ChecksResult): string {
  const format = getFormat();

  switch (format) {
    case 'json':
      return JSON.stringify(result, null, 2);
    case 'table':
      return formatArrayAsTable(result.checks, ['name', 'status', 'conclusion', 'required']);
    case 'compact':
    default:
      return formatChecksCompact(result);
  }
}

export function formatComments(type: 'pr' | 'issue', number: number, comments: Comment[]): string {
  const format = getFormat();

  switch (format) {
    case 'json':
      return JSON.stringify({ type, number, count: comments.length, comments }, null, 2);
    case 'table':
      return `${type.toUpperCase()} #${number}:\n` + formatArrayAsTable(comments, ['id', 'author', 'createdAt', 'body']);
    case 'compact':
    default:
      if (comments.length === 0) return `${type}#${number}.comments[0]{}:`;
      return `${type}#${number}.` + formatCommentsCompact(comments);
  }
}

export function formatMutationResult(action: string, data: Record<string, unknown>): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ success: true, action, ...data }, null, 2);
  }

  // TOON compact format
  const parts = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}:${v}`);
  return `${action}:${parts.join('|')}`;
}

export function formatError(error: string, details?: string): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ success: false, error, details }, null, 2);
  }

  // Clean structured format that's always parseable
  const lines = [`[ERROR] ${error}`];
  if (details) {
    // Include full details on subsequent lines
    lines.push('---');
    lines.push(details.trim());
  }
  return lines.join('\n');
}

export function output(data: string): void {
  console.log(data);
}

export function errorOutput(error: string, details?: string): never {
  console.log(formatError(error, details));
  process.exit(1);
}

/**
 * Handle any error with full context preservation
 * Use this in catch blocks to ensure Claude always sees full output
 * Works for both GitError and GhError (duck typing to avoid circular imports)
 */
export function handleError(error: unknown): never {
  // Check for GitError/GhError shape (duck typing to avoid circular import)
  if (
    error !== null &&
    typeof error === 'object' &&
    'summary' in error &&
    'fullOutput' in error &&
    typeof (error as { summary: unknown }).summary === 'string' &&
    typeof (error as { fullOutput: unknown }).fullOutput === 'string'
  ) {
    const customError = error as { summary: string; fullOutput: string };
    errorOutput(customError.summary, customError.fullOutput);
  }
  if (error instanceof Error) {
    errorOutput(error.message);
  }
  errorOutput('Unknown error');
}

// Git formatters

export function formatStatus(status: GitStatus): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify(status, null, 2);
  }

  if (format === 'table') {
    const rows: string[][] = [];
    rows.push(['Branch', status.branch + (status.upstream ? ` → ${status.upstream}` : '')]);
    if (status.ahead > 0 || status.behind > 0) {
      rows.push(['Sync', `ahead: ${status.ahead}, behind: ${status.behind}`]);
    }
    if (status.isRebase) {
      rows.push(['Rebase', `${status.rebaseStep}/${status.rebaseTotal}`]);
    }
    rows.push(['Staged', String(status.staged.length)]);
    rows.push(['Modified', String(status.modified.length)]);
    rows.push(['Untracked', String(status.untracked.length)]);
    rows.push(['Conflicts', String(status.conflicts.length)]);

    const maxLabel = Math.max(...rows.map(r => r[0].length));
    return rows.map(([label, value]) => `${label.padEnd(maxLabel)} | ${value}`).join('\n');
  }

  // Compact format: single line
  const parts: string[] = [];

  // Rebase state takes priority
  if (status.isRebase) {
    parts.push(`REBASE`);
    if (status.rebaseStep && status.rebaseTotal) {
      parts.push(`${status.rebaseStep}/${status.rebaseTotal}`);
    }
    if (status.conflicts.length > 0) {
      parts.push(`conflicts[${status.conflicts.length}]`);
    }
    return `status:${parts.join('|')}`;
  }

  // Clean state
  if (status.isClean) {
    return `status:clean`;
  }

  // Build status parts
  if (status.staged.length > 0) {
    parts.push(`staged[${status.staged.length}]`);
  }
  if (status.modified.length > 0) {
    parts.push(`modified[${status.modified.length}]`);
  }
  if (status.untracked.length > 0) {
    parts.push(`untracked[${status.untracked.length}]`);
  }
  if (status.conflicts.length > 0) {
    parts.push(`conflicts[${status.conflicts.length}]`);
  }

  // Branch info
  let branchInfo = status.branch;
  if (status.ahead > 0 || status.behind > 0) {
    const sync: string[] = [];
    if (status.ahead > 0) sync.push(`+${status.ahead}`);
    if (status.behind > 0) sync.push(`-${status.behind}`);
    branchInfo += `(${sync.join('/')})`;
  }

  return `status:${branchInfo}|${parts.join('|')}`;
}

export function formatDiffStats(stats: DiffStats): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify(stats, null, 2);
  }

  if (format === 'table') {
    if (stats.fileStats.length === 0) return 'No changes';
    const rows = stats.fileStats.map(f => ({
      file: f.file,
      additions: `+${f.additions}`,
      deletions: `-${f.deletions}`,
    }));
    return formatArrayAsTable(rows, ['file', 'additions', 'deletions'] as (keyof typeof rows[0])[]) +
      `\n\nTotal: ${stats.files} files, +${stats.additions}, -${stats.deletions}`;
  }

  return `diff{+,-,files}:+${stats.additions},-${stats.deletions},${stats.files}`;
}

export function formatDiffFull(diff: string): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ diff }, null, 2);
  }

  // For full diff, just return a truncated version if too long
  const lines = diff.split('\n');
  if (lines.length > 100) {
    return lines.slice(0, 100).join('\n') + `\n... truncated (${lines.length - 100} more lines)`;
  }
  return diff;
}

export function formatConflicts(conflicts: ConflictFile[]): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ count: conflicts.length, conflicts }, null, 2);
  }

  if (conflicts.length === 0) {
    return 'conflicts[0]{}:';
  }

  if (format === 'table') {
    const rows = conflicts.map(c => ({
      file: c.path,
      lines: c.conflictLines.join(', '),
    }));
    return formatArrayAsTable(rows, ['file', 'lines'] as (keyof typeof rows[0])[]);
  }

  const header = `conflicts[${conflicts.length}]{file|lines}:`;
  const rows = conflicts.map(c => `${c.path}|${c.conflictLines.join(';')}`);
  return [header, ...rows].join('\n');
}

export function formatRebaseResult(result: RebaseResult): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (result.success) {
    return 'rebase:success';
  }

  const parts = ['rebase'];
  if (result.step && result.total) {
    parts.push(`${result.step}/${result.total}`);
  }
  if (result.conflicts && result.conflicts.length > 0) {
    parts.push(`conflicts[${result.conflicts.length}]{${result.conflicts.join('|')}}`);
  }
  if (result.message) {
    parts.push(result.message);
  }

  return parts.join(':');
}

export function formatStageResult(files: string[]): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ staged: files }, null, 2);
  }

  if (format === 'table') {
    return files.length > 0
      ? `Staged files:\n${files.map(f => `  ${f}`).join('\n')}`
      : 'No files staged';
  }

  return `staged[${files.length}]:${files.join('|')}`;
}

export function formatWorktreeList(porcelain: string): string {
  const format = getFormat();

  if (!porcelain.trim()) {
    return format === 'json'
      ? JSON.stringify({ count: 0, worktrees: [] }, null, 2)
      : 'worktrees[0]{}:';
  }

  // Parse porcelain format: blocks separated by blank lines
  // Each block: worktree /path\nHEAD sha\nbranch refs/heads/name
  const blocks = porcelain.trim().split('\n\n');
  const worktrees = blocks.map(block => {
    const lines = block.split('\n');
    const path = lines.find(l => l.startsWith('worktree '))?.replace('worktree ', '') || '';
    const head = lines.find(l => l.startsWith('HEAD '))?.replace('HEAD ', '').slice(0, 7) || '';
    const branchLine = lines.find(l => l.startsWith('branch '));
    const branch = branchLine ? branchLine.replace('branch refs/heads/', '') : '(detached)';
    return { path, head, branch };
  });

  if (format === 'json') {
    return JSON.stringify({ count: worktrees.length, worktrees }, null, 2);
  }

  if (format === 'table') {
    return formatArrayAsTable(worktrees, ['path', 'branch', 'head'] as (keyof typeof worktrees[0])[]);
  }

  // Compact format
  const header = `worktrees[${worktrees.length}]{path|branch|head}:`;
  const rows = worktrees.map(w => `${w.path}|${w.branch}|${w.head}`);
  return [header, ...rows].join('\n');
}

export function formatSuccess(action: string, message?: string): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify({ success: true, action, message }, null, 2);
  }

  return message ? `${action}:${message}` : `${action}:ok`;
}
