import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export interface ApprovalConfig {
  requires: string[];
  auto: string[];
}

export interface RateLimitConfig {
  type: 'rpm' | 'concurrency' | 'none';
  limit?: number;
}

export interface ExecutionConfig {
  type: 'local' | 'remote';
  host?: string;  // Remote gateway host (e.g., "polariss-mac-mini-1")
  port?: number;  // Remote gateway port (default: 4100)
  token?: string; // Gateway token for authentication
}

export interface ServiceConfig {
  name: string;
  tool: string;
  toolPath: string;
  enabled: boolean;
  authVars: string[];
  rateLimit: RateLimitConfig;
  approval: ApprovalConfig;
  execution: ExecutionConfig;
}

interface GatewayJson {
  enabled?: boolean;
  authVars?: string[];
  rateLimit?: {
    type: 'rpm' | 'concurrency' | 'none';
    limit?: number;
  };
  approval?: {
    auto?: string[];
    requires?: string[];
  };
  execution?: {
    type?: 'local' | 'remote';
    host?: string;
    port?: number;
    token?: string;
  };
}

let serviceRegistry: Map<string, ServiceConfig> | null = null;

export function getServicesDir(): string {
  return path.join(homedir(), '.claude', 'services');
}

/**
 * Get global remote gateway config from environment variables.
 * Returns undefined if not configured for remote execution.
 */
export function getGlobalRemoteConfig(): ExecutionConfig | undefined {
  const host = process.env.GATEWAY_REMOTE_HOST;
  const token = process.env.GATEWAY_REMOTE_TOKEN;

  if (!host || !token) {
    return undefined;
  }

  const port = process.env.GATEWAY_REMOTE_PORT
    ? parseInt(process.env.GATEWAY_REMOTE_PORT, 10)
    : 4100;

  return {
    type: 'remote',
    host,
    port,
    token,
  };
}

/**
 * Check if remote execution is globally enabled via env vars.
 */
export function isRemoteExecutionEnabled(): boolean {
  return !!process.env.GATEWAY_REMOTE_HOST && !!process.env.GATEWAY_REMOTE_TOKEN;
}

function discoverServices(): Map<string, ServiceConfig> {
  const servicesDir = getServicesDir();
  const registry = new Map<string, ServiceConfig>();

  if (!fs.existsSync(servicesDir)) {
    return registry;
  }

  const entries = fs.readdirSync(servicesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith('-cc')) continue;

    const gatewayPath = path.join(servicesDir, entry.name, 'gateway.json');
    if (!fs.existsSync(gatewayPath)) continue; // Skip silently — allows WIP tools

    try {
      const raw = fs.readFileSync(gatewayPath, 'utf-8');
      const json: GatewayJson = JSON.parse(raw);

      // Derive service name: strip -cc suffix (e.g. "linear-cc" → "linear")
      const name = entry.name.replace(/-cc$/, '');

      // Determine execution config: per-service > global env > local default
      const globalRemote = getGlobalRemoteConfig();
      const serviceExecType = json.execution?.type;

      let execution: ExecutionConfig;
      if (serviceExecType === 'remote' || (serviceExecType !== 'local' && globalRemote)) {
        // Use remote execution (either explicitly set or global default)
        execution = {
          type: 'remote',
          host: json.execution?.host ?? globalRemote?.host,
          port: json.execution?.port ?? globalRemote?.port ?? 4100,
          token: json.execution?.token ?? globalRemote?.token,
        };
      } else {
        // Local execution
        execution = { type: 'local' };
      }

      registry.set(name, {
        name,
        tool: entry.name,
        toolPath: entry.name,
        enabled: json.enabled ?? true,
        authVars: json.authVars ?? [],
        rateLimit: {
          type: json.rateLimit?.type ?? 'rpm',
          limit: json.rateLimit?.limit,
        },
        approval: {
          requires: json.approval?.requires ?? [],
          auto: json.approval?.auto ?? [],
        },
        execution,
      });
    } catch (err) {
      // Malformed gateway.json → skip + warn
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`WARN: Skipping ${entry.name}/gateway.json — ${msg}`);
    }
  }

  return registry;
}

export function loadServices(): Map<string, ServiceConfig> {
  if (!serviceRegistry) {
    serviceRegistry = discoverServices();
  }
  return serviceRegistry;
}

export function reloadServices(): Map<string, ServiceConfig> {
  serviceRegistry = null;
  return loadServices();
}

export function getService(name: string): ServiceConfig | undefined {
  return loadServices().get(name);
}

export function listServices(): ServiceConfig[] {
  return Array.from(loadServices().values());
}

export function resolveToolEntryPoint(config: ServiceConfig): string {
  return path.join(getServicesDir(), config.toolPath, 'src', 'index.ts');
}
