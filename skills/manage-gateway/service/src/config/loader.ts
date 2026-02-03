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

export function getSkillsDir(): string {
  return path.join(homedir(), '.claude', 'skills');
}

// Legacy: still check services dir for backwards compatibility
export function getServicesDir(): string {
  return path.join(homedir(), '.claude', 'services');
}

/**
 * Get global remote gateway config from environment variables.
 * Returns undefined if not configured for remote execution.
 */
export function getGlobalRemoteConfig(): ExecutionConfig | undefined {
  const host = process.env.GATEWAY_REMOTE_HOST;
  const token = process.env.GATEWAY_REMOTE_TOKEN ?? process.env.OP_SERVICE_ACCOUNT_TOKEN;

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
  const token = process.env.GATEWAY_REMOTE_TOKEN ?? process.env.OP_SERVICE_ACCOUNT_TOKEN;
  return !!process.env.GATEWAY_REMOTE_HOST && !!token;
}

function registerService(
  registry: Map<string, ServiceConfig>,
  name: string,
  toolName: string,
  toolPath: string,
  json: GatewayJson
): void {
  const globalRemote = getGlobalRemoteConfig();
  const serviceExecType = json.execution?.type;

  let execution: ExecutionConfig;
  if (serviceExecType === 'remote' || (serviceExecType !== 'local' && globalRemote)) {
    execution = {
      type: 'remote',
      host: json.execution?.host ?? globalRemote?.host,
      port: json.execution?.port ?? globalRemote?.port ?? 4100,
      token: json.execution?.token ?? globalRemote?.token,
    };
  } else {
    execution = { type: 'local' };
  }

  registry.set(name, {
    name,
    tool: toolName,
    toolPath,
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
}

function discoverServices(): Map<string, ServiceConfig> {
  const registry = new Map<string, ServiceConfig>();

  // 1. Discover from skills folders (new location): ~/.claude/skills/*/service/gateway.json
  const skillsDir = getSkillsDir();
  if (fs.existsSync(skillsDir)) {
    const skillEntries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const skill of skillEntries) {
      if (!skill.isDirectory()) continue;

      const serviceDir = path.join(skillsDir, skill.name, 'service');
      const gatewayPath = path.join(serviceDir, 'gateway.json');
      if (!fs.existsSync(gatewayPath)) continue;

      try {
        const raw = fs.readFileSync(gatewayPath, 'utf-8');
        const json: GatewayJson = JSON.parse(raw);

        // Derive service name from skill folder (e.g. "manage-linear" → "linear")
        const name = skill.name.replace(/^manage-/, '');
        const toolPath = path.join(skill.name, 'service');

        registerService(registry, name, skill.name, toolPath, json);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`WARN: Skipping ${skill.name}/service/gateway.json — ${msg}`);
      }
    }
  }

  // 2. Discover from legacy services folder: ~/.claude/services/*-cc/gateway.json
  const servicesDir = getServicesDir();
  if (fs.existsSync(servicesDir)) {
    const entries = fs.readdirSync(servicesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.endsWith('-cc')) continue;

      const gatewayPath = path.join(servicesDir, entry.name, 'gateway.json');
      if (!fs.existsSync(gatewayPath)) continue;

      try {
        const raw = fs.readFileSync(gatewayPath, 'utf-8');
        const json: GatewayJson = JSON.parse(raw);

        // Derive service name: strip -cc suffix (e.g. "linear-cc" → "linear")
        const name = entry.name.replace(/-cc$/, '');

        // Skip if already registered from skills folder
        if (registry.has(name)) continue;

        registerService(registry, name, entry.name, entry.name, json);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`WARN: Skipping ${entry.name}/gateway.json — ${msg}`);
      }
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
  // Check skills folder first (new location)
  const skillsPath = path.join(getSkillsDir(), config.toolPath, 'src', 'index.ts');
  if (fs.existsSync(skillsPath)) {
    return skillsPath;
  }

  // Fall back to legacy services folder
  return path.join(getServicesDir(), config.toolPath, 'src', 'index.ts');
}
