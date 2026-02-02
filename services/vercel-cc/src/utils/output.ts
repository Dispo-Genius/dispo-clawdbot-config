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
 * Compact formatters for different Vercel data types
 */
interface DeploymentData {
  id?: string;
  url?: string;
  state?: string;
  target?: string;
  created?: string;
  creator?: string;
  inspectorUrl?: string;
}

interface ProjectData {
  id?: string;
  name?: string;
  framework?: string;
  updatedAt?: string | number;
}

interface DomainData {
  name?: string;
  apexName?: string;
  verified?: boolean;
}

interface EnvVarData {
  key?: string;
  value?: string;
  target?: string[] | string;
  type?: string;
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

function abbrevTarget(target: string | undefined): string {
  if (!target) return '-';
  if (target === 'production') return 'prod';
  return target;
}

function formatDeploymentCompact(d: DeploymentData): string {
  return `${v(d.id)}|${v(d.url)}|${v(d.state)}|${abbrevTarget(d.target)}|${v(d.created)}`;
}

function formatProjectCompact(p: ProjectData): string {
  return `${v(p.id)}|${v(p.name)}|${v(p.framework)}`;
}

function formatDomainCompact(d: DomainData): string {
  const verified = d.verified ? 'yes' : 'no';
  return `${v(d.name)}|${v(d.apexName)}|${verified}`;
}

function formatEnvVarCompact(e: EnvVarData): string {
  const target = Array.isArray(e.target) ? e.target.map(t => t === 'production' ? 'prod' : t).join(';') : abbrevTarget(e.target);
  return `${v(e.key)}|${v(e.type)}|${target}`;
}

/**
 * Format single deployment
 */
export function formatDeployment(
  deployment: DeploymentData & Record<string, unknown>,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, deployment }, null, 2);
    case 'table':
      return formatObjectAsTable({ success: true, ...deployment });
    case 'compact':
    default:
      return formatDeploymentCompact(deployment);
  }
}

/**
 * Format list of deployments
 */
export function formatDeploymentList(
  project: string,
  deployments: DeploymentData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, project, count: deployments.length, deployments }, null, 2);
    case 'table':
      return `Project: ${project}\n` + formatArrayAsTable(deployments, ['id', 'url', 'state', 'target', 'created']);
    case 'compact':
    default:
      return `${project}.` + formatToonArray('deployments', deployments, ['id', 'url', 'state', 'target', 'created'], (d, field) => {
        switch (field) {
          case 'id': return v(d.id);
          case 'url': return v(d.url);
          case 'state': return v(d.state);
          case 'target': return abbrevTarget(d.target);
          case 'created': return v(d.created);
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
  source: string,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, source, count: projects.length, projects }, null, 2);
    case 'table':
      return formatArrayAsTable(projects, ['id', 'name', 'framework']);
    case 'compact':
    default:
      return formatToonArray('projects', projects, ['id', 'name', 'framework'], (p, field) => {
        switch (field) {
          case 'id': return v(p.id);
          case 'name': return v(p.name);
          case 'framework': return v(p.framework);
          default: return '-';
        }
      });
  }
}

/**
 * Format single project
 */
export function formatProject(
  project: ProjectData & Record<string, unknown>,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, project }, null, 2);
    case 'table':
      return formatObjectAsTable({ success: true, ...project });
    case 'compact':
    default:
      return formatProjectCompact(project);
  }
}

/**
 * Format list of domains
 */
export function formatDomainList(
  projectId: string,
  domains: DomainData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, projectId, count: domains.length, domains }, null, 2);
    case 'table':
      return `Project: ${projectId}\n` + formatArrayAsTable(domains, ['name', 'apexName', 'verified']);
    case 'compact':
    default:
      return `${projectId}.` + formatToonArray('domains', domains, ['name', 'apex', 'verified'], (d, field) => {
        switch (field) {
          case 'name': return v(d.name);
          case 'apex': return v(d.apexName);
          case 'verified': return d.verified ? 'yes' : 'no';
          default: return '-';
        }
      });
  }
}

/**
 * Format list of env vars
 */
export function formatEnvVarList(
  projectId: string,
  envVars: EnvVarData[],
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  switch (format) {
    case 'json':
      return JSON.stringify({ success: true, projectId, count: envVars.length, envVars }, null, 2);
    case 'table':
      return `Project: ${projectId}\n` + formatArrayAsTable(envVars, ['key', 'type', 'target']);
    case 'compact':
    default:
      return `${projectId}.` + formatToonArray('envvars', envVars, ['key', 'type', 'target'], (e, field) => {
        switch (field) {
          case 'key': return v(e.key);
          case 'type': return v(e.type);
          case 'target': return Array.isArray(e.target) ? e.target.map(t => t === 'production' ? 'prod' : t).join(';') : abbrevTarget(e.target);
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
 * Format mutation result (promote, cancel, add, remove)
 */
export function formatMutationResult(
  action: string,
  data: Record<string, unknown>,
  options: OutputOptions = {}
): string {
  const format = getFormat(options);

  if (format === 'json') {
    return JSON.stringify({ success: true, ...data }, null, 2);
  }

  // TOON compact format for mutations
  const summary = Object.entries(data)
    .slice(0, 3)
    .map(([k, val]) => `${k}:${formatValue(val)}`)
    .join('|');
  return `${action}:${summary}`;
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
