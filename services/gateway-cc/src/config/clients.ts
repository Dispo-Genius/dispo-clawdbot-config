import { getDb } from '../db/migrate';
import { getRegisteredClientByToken } from '../server/auth-register';

export interface ClientConfig {
  id: string;
  name: string;
  token: string;
  profile: string; // Credential profile name (e.g., 'andy', 'polaris')
  rateLimit: {
    rpm: number;
  };
  enabled: boolean;
}

export interface ClientContext {
  id: string;
  name: string;
  profile: string;
  rateLimit: { rpm: number };
}

let clientRegistry: Map<string, ClientConfig> | null = null;

/**
 * Load client tokens from environment variables.
 *
 * Pre-configured clients (new names, with backwards compat):
 * - CC_CLIENT_KEY_POLARIS (or GATEWAY_TOKEN_POLARIS): Polaris Mac Mini
 * - CC_CLIENT_KEY_LAPTOP (or GATEWAY_TOKEN_LAPTOP): Laptop remote access
 *
 * Dynamic clients:
 * - CC_CLIENT_<NAME>=<token> (or GATEWAY_CLIENT_<NAME>=<token>)
 * - Rate limits: CC_CLIENT_<NAME>_RPM=<number>
 */
export function loadClients(): Map<string, ClientConfig> {
  if (clientRegistry) return clientRegistry;

  clientRegistry = new Map();

  // Load pre-configured tokens (new name first, fall back to legacy)
  // profile determines which credential set to use on the gateway
  const preConfigured: Array<{ envVars: string[]; id: string; name: string; profile: string }> = [
    { envVars: ['CC_CLIENT_KEY_POLARIS', 'GATEWAY_TOKEN_POLARIS'], id: 'polaris', name: 'Polaris', profile: 'polaris' },
    { envVars: ['CC_CLIENT_KEY_LAPTOP', 'GATEWAY_TOKEN_LAPTOP'], id: 'laptop', name: 'Laptop', profile: 'andy' },
  ];

  for (const { envVars, id, name, profile } of preConfigured) {
    // Find first defined env var (new name takes precedence)
    const activeEnvVar = envVars.find((v) => process.env[v]);
    const token = activeEnvVar ? process.env[activeEnvVar] : undefined;

    if (token && activeEnvVar) {
      const rpmEnv = process.env[`${activeEnvVar}_RPM`];
      const rpm = rpmEnv ? parseInt(rpmEnv, 10) : 60;

      clientRegistry.set(token, {
        id,
        name,
        token,
        profile,
        rateLimit: { rpm },
        enabled: !isClientKilled(id),
      });
    }
  }

  // Support dynamic CC_CLIENT_* and legacy GATEWAY_CLIENT_* patterns
  for (const [key, value] of Object.entries(process.env)) {
    const isNewPattern = key.startsWith('CC_CLIENT_') && !key.startsWith('CC_CLIENT_KEY_');
    const isLegacyPattern = key.startsWith('GATEWAY_CLIENT_');
    const isRpmKey = key.endsWith('_RPM');

    if ((isNewPattern || isLegacyPattern) && !isRpmKey && value) {
      const prefix = isNewPattern ? 'CC_CLIENT_' : 'GATEWAY_CLIENT_';
      const name = key.replace(prefix, '').toLowerCase();
      const id = name;
      const rpmEnv = process.env[`${key}_RPM`];
      const rpm = rpmEnv ? parseInt(rpmEnv, 10) : 60;

      // Don't override pre-configured
      if (!clientRegistry.has(value)) {
        clientRegistry.set(value, {
          id,
          name,
          token: value,
          profile: id, // Dynamic clients use their id as profile
          rateLimit: { rpm },
          enabled: !isClientKilled(id),
        });
      }
    }
  }

  return clientRegistry;
}

export function reloadClients(): Map<string, ClientConfig> {
  clientRegistry = null;
  return loadClients();
}

export function getClientByToken(token: string): ClientConfig | undefined {
  // First check in-memory registry (env-configured clients)
  const envClient = loadClients().get(token);
  if (envClient) return envClient;

  // Then check database-registered clients
  const dbClient = getRegisteredClientByToken(token);
  if (dbClient) {
    return {
      id: dbClient.id,
      name: dbClient.username,
      token: dbClient.token,
      profile: dbClient.id, // DB-registered clients use their id as profile
      rateLimit: { rpm: 60 }, // Default rate limit for registered clients
      enabled: !isClientKilled(dbClient.id),
    };
  }

  return undefined;
}

export function listClients(): ClientConfig[] {
  return Array.from(loadClients().values());
}

// --- Client-level kill switches (stored in DB) ---

export function isClientKilled(clientId: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT active FROM kill_switch WHERE service = ?')
    .get(`client:${clientId}`) as { active: number } | undefined;
  return row?.active === 1;
}

export function killClient(clientId: string, reason: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO kill_switch (service, active, reason, updated_at)
     VALUES (?, 1, ?, datetime('now'))
     ON CONFLICT(service) DO UPDATE SET active = 1, reason = excluded.reason, updated_at = datetime('now')`
  ).run(`client:${clientId}`, reason);

  // Refresh registry
  reloadClients();
}

export function resumeClient(clientId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE kill_switch SET active = 0, reason = NULL, updated_at = datetime('now') WHERE service = ?`
  ).run(`client:${clientId}`);

  // Refresh registry
  reloadClients();
}

export function getClientKillStates(): Array<{ clientId: string; active: boolean; reason: string | null }> {
  const db = getDb();
  const rows = db
    .prepare("SELECT service, active, reason FROM kill_switch WHERE service LIKE 'client:%'")
    .all() as { service: string; active: number; reason: string | null }[];

  return rows.map((r) => ({
    clientId: r.service.replace('client:', ''),
    active: r.active === 1,
    reason: r.reason,
  }));
}
