// Gateway client for security service

import * as https from 'https';
import * as http from 'http';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// Use same env vars as gateway-cc for remote execution
const GATEWAY_HOST = process.env.GATEWAY_REMOTE_HOST || 'localhost';
const GATEWAY_PORT = parseInt(process.env.GATEWAY_REMOTE_PORT || '4100', 10);

function getGatewayToken(): string | null {
  // Use the same token env vars as gateway-cc
  const token = process.env.GATEWAY_REMOTE_TOKEN ?? process.env.OP_SERVICE_ACCOUNT_TOKEN;
  if (token) {
    return token;
  }

  // Fallback to reading from keychain file
  const keychainPath = path.join(os.homedir(), '.claude', '.gateway-token');
  if (fs.existsSync(keychainPath)) {
    return fs.readFileSync(keychainPath, 'utf-8').trim();
  }

  return null;
}

function getClientId(): string {
  // Use machine hostname as client ID
  return os.hostname().replace(/\.local$/, '');
}

interface GatewayResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function gatewayRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<GatewayResponse<T>> {
  const token = getGatewayToken();
  if (!token) {
    return { ok: false, status: 0, error: 'No gateway token found' };
  }

  return new Promise((resolve) => {
    const options: http.RequestOptions = {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode || 0,
            data: parsed as T,
            error: parsed.error,
          });
        } catch {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode || 0,
            data: data as unknown as T,
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ ok: false, status: 0, error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

export interface ScanReportInput {
  repo_path: string;
  secrets_found: number;
  scan_type: 'manual' | 'cron' | 'pre-commit' | 'history';
  details?: unknown;
}

export interface ScanReportResponse {
  status: string;
  id: number;
  alertNeeded: boolean;
}

export async function reportScan(report: ScanReportInput): Promise<GatewayResponse<ScanReportResponse>> {
  return gatewayRequest<ScanReportResponse>('POST', '/security/report', report);
}

export interface SecurityConfig {
  client_id: string;
  repos: string[];
  cron_enabled: boolean;
  slack_notify: boolean;
  updated_at?: string;
}

export async function getConfig(): Promise<GatewayResponse<SecurityConfig>> {
  const clientId = getClientId();
  return gatewayRequest<SecurityConfig>('GET', `/security/config/${clientId}`);
}

export interface ConfigUpdateInput {
  repos?: string[];
  cron_enabled?: boolean;
  slack_notify?: boolean;
}

export async function updateConfig(update: ConfigUpdateInput): Promise<GatewayResponse<SecurityConfig>> {
  const clientId = getClientId();
  return gatewayRequest<SecurityConfig>('PUT', `/security/config/${clientId}`, update);
}

export interface ScanHistoryEntry {
  id: number;
  client_id: string;
  repo_path: string;
  secrets_found: number;
  scan_type: string;
  details: string | null;
  created_at: string;
}

export interface ScanHistoryResponse {
  scans: ScanHistoryEntry[];
  count: number;
}

export async function getScanHistory(limit: number = 10): Promise<GatewayResponse<ScanHistoryResponse>> {
  const clientId = getClientId();
  return gatewayRequest<ScanHistoryResponse>('GET', `/security/history/${clientId}?limit=${limit}`);
}

export { getClientId };
