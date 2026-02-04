// TOON-style output formatting for consistent CLI output

export type OutputFormat = 'json' | 'compact';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getGlobalFormat(): OutputFormat {
  return globalFormat;
}

export interface ScanResult {
  success: boolean;
  secretsFound: number;
  path: string;
  scanType: 'manual' | 'cron' | 'pre-commit' | 'history';
  details?: unknown[];
  alertSent?: boolean;
  reportId?: number;
}

export interface StatusResult {
  hooksInstalled: string[];
  registeredRepos: string[];
  cronEnabled: boolean;
  slackNotify: boolean;
  recentScans: Array<{
    path: string;
    secretsFound: number;
    scanType: string;
    createdAt: string;
  }>;
}

export interface ConfigResult {
  clientId: string;
  repos: string[];
  cronEnabled: boolean;
  slackNotify: boolean;
}

export function output(data: unknown): void {
  if (globalFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    // Compact format - single line for easy parsing
    console.log(JSON.stringify(data));
  }
}

export function formatScanResult(result: ScanResult): string {
  if (globalFormat === 'json') {
    return JSON.stringify(result, null, 2);
  }

  const parts = [
    `scanned:${result.path}`,
    `secrets:${result.secretsFound}`,
    `type:${result.scanType}`,
  ];

  if (result.reportId) {
    parts.push(`reportId:${result.reportId}`);
  }

  if (result.alertSent) {
    parts.push('alert:sent');
  }

  return parts.join('|');
}

export function formatStatusResult(result: StatusResult): string {
  if (globalFormat === 'json') {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];

  lines.push(`hooks_installed:${result.hooksInstalled.length}`);
  if (result.hooksInstalled.length > 0) {
    result.hooksInstalled.forEach((h) => lines.push(`  - ${h}`));
  }

  lines.push(`registered_repos:${result.registeredRepos.length}`);
  if (result.registeredRepos.length > 0) {
    result.registeredRepos.forEach((r) => lines.push(`  - ${r}`));
  }

  lines.push(`cron:${result.cronEnabled ? 'enabled' : 'disabled'}`);
  lines.push(`slack_notify:${result.slackNotify ? 'on' : 'off'}`);

  if (result.recentScans.length > 0) {
    lines.push('recent_scans:');
    result.recentScans.forEach((s) => {
      lines.push(`  - ${s.path} | ${s.secretsFound} secrets | ${s.scanType} | ${s.createdAt}`);
    });
  }

  return lines.join('\n');
}

export function formatConfigResult(result: ConfigResult): string {
  if (globalFormat === 'json') {
    return JSON.stringify(result, null, 2);
  }

  const lines = [
    `client_id:${result.clientId}`,
    `cron:${result.cronEnabled ? 'enabled' : 'disabled'}`,
    `slack_notify:${result.slackNotify ? 'on' : 'off'}`,
    `repos:${result.repos.length}`,
  ];

  result.repos.forEach((r) => lines.push(`  - ${r}`));

  return lines.join('\n');
}

export function errorOutput(message: string): void {
  const error = { success: false, error: message };
  if (globalFormat === 'json') {
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.error(JSON.stringify(error));
  }
  process.exit(1);
}

export function successOutput(message: string, data?: Record<string, unknown>): void {
  const result = { success: true, message, ...data };
  output(result);
}
