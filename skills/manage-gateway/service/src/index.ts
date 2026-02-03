#!/usr/bin/env node
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// Load .env before any other imports
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../../.env'),
  resolve(homedir(), '.claude/.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true, debug: false });
    break;
  }
}

async function main() {
  const { Command } = await import('commander');
  const { getService, listServices, resolveToolEntryPoint } = await import('./config/loader');
  const { isKilled, activateKillSwitch, deactivateKillSwitch, getKillSwitchStates } = await import('./middleware/killswitch');
  const { checkRateLimit, releaseConcurrency, getRateLimitStatus } = await import('./middleware/ratelimit');
  const { checkApproval } = await import('./middleware/approval');
  const { execTool } = await import('./exec/runner');
  const { logExecution, queryUsage } = await import('./logging/logger');

  const program = new Command();

  program
    .name('gateway-cc')
    .description('Command-level gateway for -cc tools with kill switch, rate limiting, and usage logging')
    .version('1.0.0')
    .showHelpAfterError(true)
    .enablePositionalOptions();

  // --- exec ---
  program
    .command('exec')
    .description('Execute a service command through the gateway')
    .argument('<service>', 'Service name (e.g., linear)')
    .argument('<command>', 'Command to run (e.g., list-projects)')
    .argument('[args...]', 'Arguments to pass to the command')
    .allowUnknownOption()
    .passThroughOptions()
    .action(async (serviceName: string, command: string, args: string[]) => {
      // 1. Resolve service
      const svc = getService(serviceName);
      if (!svc) {
        console.error(`ERROR: Unknown service "${serviceName}". Run "gateway-cc services" to list available services.`);
        process.exit(1);
      }

      // 2. Check enabled
      if (!svc.enabled) {
        console.error(`ERROR: Service "${serviceName}" is disabled.`);
        process.exit(1);
      }

      // 3. Kill switch
      const ks = isKilled(serviceName);
      if (ks.killed) {
        console.error(`KILL_SWITCH: Service "${serviceName}" is killed. Reason: ${ks.reason ?? 'none'}`);
        process.exit(1);
      }

      // 4. Rate limit
      const rl = checkRateLimit(serviceName, svc.rateLimit);
      if (!rl.allowed) {
        if (svc.rateLimit.type === 'concurrency') {
          console.error(`RATE_LIMITED: Service "${serviceName}" max concurrent requests (${svc.rateLimit.limit}) reached.`);
        } else {
          console.error(`RATE_LIMITED: Service "${serviceName}" rate limit exceeded. Retry after ${rl.retryAfterMs}ms.`);
        }
        process.exit(1);
      }

      // 5. Approval (informational — enforcement at Claude Code layer)
      const approval = checkApproval(command, svc.approval);
      if (approval.requiresUserConfirmation) {
        console.error(`INFO: ${approval.reason}`);
      }

      // 6. Execute
      try {
        const result = await execTool(svc, command, args);
        if (svc.rateLimit.type === 'concurrency') releaseConcurrency(serviceName);
        logExecution(serviceName, command, result.exitCode, result.durationMs);
        process.exit(result.exitCode);
      } catch (err) {
        if (svc.rateLimit.type === 'concurrency') releaseConcurrency(serviceName);
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`EXEC_ERROR: ${msg}`);
        logExecution(serviceName, command, 1, null);
        process.exit(1);
      }
    });

  // --- status ---
  program
    .command('status')
    .description('Show gateway status: services, kill switches, rate limits')
    .action(() => {
      const services = listServices();
      const killStates = getKillSwitchStates();
      const killMap = new Map(killStates.map((k) => [k.service, k]));

      console.log('Gateway Status\n');

      for (const svc of services) {
        const ks = killMap.get(svc.name);
        const globalKs = killMap.get('__global__');
        const killed = (ks?.active) || (globalKs?.active) || false;
        const rl = getRateLimitStatus(svc.name, svc.rateLimit);
        const entryPoint = resolveToolEntryPoint(svc);
        const exists = existsSync(entryPoint);

        const limitDisplay = rl.limit !== null
          ? `${rl.remaining}/${rl.limit} remaining (${rl.type})`
          : `unlimited (${rl.type})`;

        const execDisplay = svc.execution.type === 'remote'
          ? `remote (${svc.execution.host}:${svc.execution.port ?? 4100})`
          : 'local';

        console.log(`  ${svc.name}`);
        console.log(`    tool:       ${svc.tool}`);
        console.log(`    enabled:    ${svc.enabled}`);
        console.log(`    execution:  ${execDisplay}`);
        console.log(`    killed:     ${killed}${killed && ks?.reason ? ` (${ks.reason})` : ''}`);
        console.log(`    rate_limit: ${limitDisplay}`);
        if (svc.execution.type === 'local') {
          console.log(`    entry:      ${entryPoint} ${exists ? '(found)' : '(MISSING)'}`);
        }
        console.log('');
      }

      const globalKill = killMap.get('__global__');
      if (globalKill?.active) {
        console.log(`  GLOBAL KILL SWITCH: active (${globalKill.reason ?? 'no reason'})\n`);
      }
    });

  // --- kill ---
  program
    .command('kill')
    .description('Activate kill switch (global, per-service, or per-client)')
    .option('-s, --service <name>', 'Service to kill (omit for global)')
    .option('-c, --client <name>', 'Client to kill (e.g., polaris, laptop)')
    .requiredOption('-r, --reason <reason>', 'Reason for killing')
    .action(async (opts: { service?: string; client?: string; reason: string }) => {
      if (opts.client) {
        const { killClient } = await import('./config/clients');
        killClient(opts.client, opts.reason);
        console.log(`Kill switch activated for client: ${opts.client} — ${opts.reason}`);
      } else {
        const target = opts.service ?? '__global__';
        activateKillSwitch(target, opts.reason);
        console.log(`Kill switch activated: ${target === '__global__' ? 'GLOBAL' : target} — ${opts.reason}`);
      }
    });

  // --- resume ---
  program
    .command('resume')
    .description('Deactivate kill switch (global, per-service, or per-client)')
    .option('-s, --service <name>', 'Service to resume (omit for global)')
    .option('-c, --client <name>', 'Client to resume (e.g., polaris, laptop)')
    .action(async (opts: { service?: string; client?: string }) => {
      if (opts.client) {
        const { resumeClient } = await import('./config/clients');
        resumeClient(opts.client);
        console.log(`Kill switch deactivated for client: ${opts.client}`);
      } else {
        const target = opts.service ?? '__global__';
        deactivateKillSwitch(target);
        console.log(`Kill switch deactivated: ${target === '__global__' ? 'GLOBAL' : target}`);
      }
    });

  // --- services ---
  program
    .command('services')
    .description('List auto-discovered services from ~/.claude/services/')
    .action(() => {
      const services = listServices();
      if (services.length === 0) {
        console.log('No services discovered.');
        return;
      }

      console.log('Discovered Services\n');
      for (const svc of services) {
        const entryPoint = resolveToolEntryPoint(svc);
        const exists = existsSync(entryPoint);

        const limitDisplay = svc.rateLimit.type === 'none'
          ? 'none'
          : svc.rateLimit.type === 'concurrency'
            ? `${svc.rateLimit.limit} concurrent`
            : `${svc.rateLimit.limit}/min`;

        console.log(`  ${svc.name}`);
        console.log(`    tool:       ${svc.tool}`);
        console.log(`    enabled:    ${svc.enabled}`);
        console.log(`    rate_limit: ${limitDisplay} (${svc.rateLimit.type})`);
        console.log(`    auth_vars:  ${svc.authVars.length > 0 ? svc.authVars.join(', ') : 'none'}`);
        console.log(`    auto:       ${svc.approval.auto.join(', ') || 'none'}`);
        console.log(`    requires:   ${svc.approval.requires.join(', ') || 'none'}`);
        console.log(`    entry:      ${exists ? 'found' : 'MISSING'}`);
        console.log('');
      }
    });

  // --- serve ---
  program
    .command('serve')
    .description('Start HTTP/HTTPS server for remote access')
    .option('-p, --port <port>', 'Port to listen on', '4100')
    .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
    .option('--https', 'Enable HTTPS with Tailscale certs')
    .option('--cert-dir <dir>', 'Directory containing TLS certs (default: ~/.gateway-certs)')
    .option('--hostname <hostname>', 'Hostname for cert files (default: polariss-mac-mini-1.tail3351a2.ts.net)')
    .action(async (opts: { port: string; host: string; https?: boolean; certDir?: string; hostname?: string }) => {
      const { startServer } = await import('./server/index');
      const port = parseInt(opts.port, 10);

      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('ERROR: Invalid port number');
        process.exit(1);
      }

      try {
        await startServer({ port, host: opts.host, https: opts.https, certDir: opts.certDir, hostname: opts.hostname });
        // Keep process running
        process.on('SIGINT', async () => {
          const { stopServer } = await import('./server/index');
          await stopServer();
          process.exit(0);
        });
        process.on('SIGTERM', async () => {
          const { stopServer } = await import('./server/index');
          await stopServer();
          process.exit(0);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`ERROR: Failed to start server: ${msg}`);
        process.exit(1);
      }
    });

  // --- usage ---
  program
    .command('usage')
    .description('Query usage logs')
    .option('-s, --service <name>', 'Filter by service')
    .option('-l, --limit <n>', 'Number of entries', '20')
    .action((opts: { service?: string; limit: string }) => {
      const entries = queryUsage(opts.service, parseInt(opts.limit, 10));
      if (entries.length === 0) {
        console.log('No usage logs found.');
        return;
      }

      console.log('Usage Logs\n');
      for (const e of entries) {
        const duration = e.duration_ms !== null ? `${e.duration_ms}ms` : 'n/a';
        const exit = e.exit_code !== null ? `exit=${e.exit_code}` : 'exit=?';
        console.log(`  ${e.created_at}  ${e.service}/${e.command}  ${exit}  ${duration}`);
      }
    });

  // --- import-sessions ---
  program
    .command('import-sessions')
    .description('Import archived sessions from CCS and legacy index files')
    .option('-n, --dry-run', 'Show what would be imported without importing')
    .action(async (opts: { dryRun?: boolean }) => {
      const { importAllSessions, discoverIndexFiles } = await import('./db/session-history');

      if (opts.dryRun) {
        const indexFiles = discoverIndexFiles();
        console.log(`Found ${indexFiles.length} index files:\n`);
        for (const { path, source } of indexFiles) {
          console.log(`  ${source}: ${path}`);
        }
        console.log('');
      }

      const result = importAllSessions(opts.dryRun);

      if (opts.dryRun) {
        console.log(`DRY RUN: Would import ${result.total} sessions\n`);
      } else {
        console.log(`Imported ${result.imported} sessions (${result.skipped} already existed)\n`);
      }

      if (result.sources.size > 0) {
        console.log('By source:');
        for (const [source, count] of result.sources) {
          console.log(`  ${source}: ${count}`);
        }
      }
    });

  // --- credentials ---
  program
    .command('credentials')
    .description('Manage profile-based credentials')
    .argument('<action>', 'Action: set, get, list, delete')
    .argument('<profile>', 'Profile name (e.g., andy, polaris)')
    .argument('[key]', 'Credential key name (required for set/get/delete)')
    .argument('[value]', 'Credential value (required for set)')
    .action(async (action: string, profile: string, key?: string, value?: string) => {
      const { getProfileCredential, setProfileCredential, deleteProfileCredential, listProfileCredentials } = await import('./utils/keychain');

      switch (action) {
        case 'set':
          if (!key || !value) {
            console.error('Usage: gateway-cc credentials set <profile> <key> <value>');
            process.exit(1);
          }
          setProfileCredential(profile, key, value);
          console.log(`Set ${key} for profile ${profile}`);
          break;

        case 'get':
          if (!key) {
            console.error('Usage: gateway-cc credentials get <profile> <key>');
            process.exit(1);
          }
          const val = getProfileCredential(profile, key);
          if (val) {
            console.log(val);
          } else {
            console.error(`Key ${key} not found in profile ${profile}`);
            process.exit(1);
          }
          break;

        case 'list':
          const keys = listProfileCredentials(profile);
          if (keys.length === 0) {
            console.log(`No credentials found for profile ${profile}`);
          } else {
            console.log(`Credentials for profile ${profile}:`);
            for (const k of keys) {
              console.log(`  ${k}`);
            }
          }
          break;

        case 'delete':
          if (!key) {
            console.error('Usage: gateway-cc credentials delete <profile> <key>');
            process.exit(1);
          }
          if (deleteProfileCredential(profile, key)) {
            console.log(`Deleted ${key} from profile ${profile}`);
          } else {
            console.error(`Key ${key} not found in profile ${profile}`);
            process.exit(1);
          }
          break;

        default:
          console.error(`Unknown action: ${action}. Use: set, get, list, delete`);
          process.exit(1);
      }
    });

  // --- sessions ---
  program
    .command('sessions')
    .description('Query session history')
    .option('-p, --project <name>', 'Filter by project name')
    .option('-s, --source <name>', 'Filter by source (ccs/account1, legacy)')
    .option('-a, --after <date>', 'Sessions after date (ISO format)')
    .option('-q, --search <text>', 'Search in summary')
    .option('-l, --limit <n>', 'Number of entries', '20')
    .action(async (opts: { project?: string; source?: string; after?: string; search?: string; limit: string }) => {
      const { listSessions, getSessionStats } = await import('./db/session-history');

      const sessions = listSessions({
        project: opts.project,
        source: opts.source,
        after: opts.after,
        search: opts.search,
        limit: parseInt(opts.limit, 10),
      });

      if (sessions.length === 0) {
        const stats = getSessionStats();
        if (stats.length === 0) {
          console.log('No sessions found. Run "gateway-cc import-sessions" first.');
        } else {
          console.log('No sessions match filters.');
        }
        return;
      }

      console.log('Session History\n');
      for (const s of sessions) {
        const date = s.start_time ? new Date(s.start_time * 1000).toISOString().slice(0, 10) : 'unknown';
        const turns = s.turn_count ? `${s.turn_count} turns` : '';
        const summary = s.summary ? s.summary.slice(0, 60) : '(no summary)';
        console.log(`  ${date}  ${s.project.padEnd(20)}  ${turns.padEnd(10)}  ${summary}`);
      }

      if (!opts.project && !opts.source && !opts.after && !opts.search) {
        const stats = getSessionStats();
        console.log('\nTotal by source:');
        for (const { source, count } of stats) {
          console.log(`  ${source}: ${count}`);
        }
      }
    });

  // --- dashboard (aggregated view) ---
  program
    .command('dashboard')
    .description('Show gateway dashboard overview')
    .action(async () => {
      const { listSessions } = await import('./coordination/session-registry');
      const { listAllLocks } = await import('./coordination/lock-manager');
      const { queryActivity } = await import('./orchestrator/activity');
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');

      const now = Math.floor(Date.now() / 1000);
      const staleThreshold = 5 * 60; // 5 minutes

      // Sessions
      const sessions = listSessions();
      const activeSessions = sessions.filter(s => (now - s.last_activity_at) < staleThreshold);
      const staleSessions = sessions.filter(s => (now - s.last_activity_at) >= staleThreshold);

      // Locks
      const locks = listAllLocks();

      // Activity
      const activity = queryActivity({ limit: 10 });

      // Kill switches
      const killStates = getKillSwitchStates();
      const activeKills = killStates.filter(k => k.active);

      // Accounts
      const usagePath = join(__dirname, '..', 'data', 'usage.json');
      let accounts: { id: string; usagePercent: number; resetTime: string }[] = [];
      if (existsSync(usagePath)) {
        const data = JSON.parse(readFileSync(usagePath, 'utf-8'));
        accounts = Object.values(data.accounts || {}) as typeof accounts;
      }

      console.log('Gateway Dashboard\n');

      console.log(`  Sessions:   ${activeSessions.length} active, ${staleSessions.length} stale`);
      console.log(`  Locks:      ${locks.length} held`);
      console.log(`  Kill:       ${activeKills.length > 0 ? activeKills.map(k => k.service === '__global__' ? 'GLOBAL' : k.service).join(', ') : 'none'}`);
      console.log(`  Accounts:   ${accounts.map(a => `${a.id}=${a.usagePercent}%`).join(', ') || 'none'}`);
      console.log('');

      if (activeSessions.length > 0) {
        console.log('Active Sessions:');
        for (const s of activeSessions.slice(0, 5)) {
          const age = Math.floor((now - s.last_activity_at) / 60);
          console.log(`  ${s.id.slice(0, 8)}  ${s.project.padEnd(20)}  ${age}m ago`);
        }
        console.log('');
      }

      if (activity.length > 0) {
        console.log('Recent Activity:');
        for (const a of activity.slice(0, 5)) {
          const time = new Date(a.created_at * 1000).toISOString().slice(11, 19);
          console.log(`  ${time}  ${a.operation.padEnd(6)}  ${a.file_path.slice(-40)}`);
        }
        console.log('');
      }
    });

  // --- dashboard:usage ---
  program
    .command('dashboard:usage')
    .description('Show execution history')
    .option('-l, --limit <n>', 'Number of entries', '30')
    .action((opts: { limit: string }) => {
      const entries = queryUsage(undefined, parseInt(opts.limit, 10));
      if (entries.length === 0) {
        console.log('No usage logs found.');
        return;
      }

      console.log('Execution History\n');
      for (const e of entries) {
        const duration = e.duration_ms !== null ? `${e.duration_ms}ms`.padEnd(8) : 'n/a'.padEnd(8);
        const exit = e.exit_code !== null ? (e.exit_code === 0 ? '✓' : '✗') : '?';
        console.log(`  ${e.created_at.slice(0, 19)}  ${exit}  ${duration}  ${e.service}/${e.command}`);
      }
    });

  // --- dashboard:sessions ---
  program
    .command('dashboard:sessions')
    .description('Show active Claude sessions')
    .action(async () => {
      const { listSessions } = await import('./coordination/session-registry');

      const sessions = listSessions();
      if (sessions.length === 0) {
        console.log('No sessions found.');
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const staleThreshold = 5 * 60;

      console.log('Claude Sessions\n');
      for (const s of sessions) {
        const age = Math.floor((now - s.last_activity_at) / 60);
        const stale = (now - s.last_activity_at) >= staleThreshold ? ' (stale)' : '';
        const op = s.current_operation ? ` [${s.current_operation}]` : '';
        console.log(`  ${s.id.slice(0, 8)}  ${s.project.padEnd(20)}  ${s.client_id.padEnd(10)}  ${age}m ago${stale}${op}`);
        if (s.files_editing && s.files_editing.length > 0) {
          console.log(`             editing: ${s.files_editing.slice(0, 3).join(', ')}`);
        }
      }
    });

  // --- dashboard:locks ---
  program
    .command('dashboard:locks')
    .description('Show resource locks')
    .action(async () => {
      const { listAllLocks } = await import('./coordination/lock-manager');

      const locks = listAllLocks();
      if (locks.length === 0) {
        console.log('No locks found.');
        return;
      }

      console.log('Resource Locks\n');
      for (const l of locks) {
        const age = Math.floor((Date.now() / 1000 - l.acquired_at) / 60);
        console.log(`  ${l.session_id.slice(0, 8)}  ${l.lock_type.padEnd(8)}  ${l.mode.padEnd(9)}  ${age}m  ${l.target}`);
      }
    });

  // --- dashboard:activity ---
  program
    .command('dashboard:activity')
    .description('Show file operations')
    .option('-l, --limit <n>', 'Number of entries', '30')
    .option('-u, --uncommitted', 'Only show uncommitted')
    .action(async (opts: { limit: string; uncommitted?: boolean }) => {
      const { queryActivity } = await import('./orchestrator/activity');

      const activity = queryActivity({
        limit: parseInt(opts.limit, 10),
        uncommitted_only: opts.uncommitted,
      });

      if (activity.length === 0) {
        console.log('No activity found.');
        return;
      }

      console.log('File Activity\n');
      for (const a of activity) {
        const time = new Date(a.created_at * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const committed = a.committed ? '✓' : '○';
        console.log(`  ${time}  ${committed}  ${a.operation.padEnd(6)}  ${a.session_id.slice(0, 8)}  ${a.file_path}`);
      }
    });

  // --- dashboard:accounts ---
  program
    .command('dashboard:accounts')
    .description('Show Claude API accounts')
    .action(async () => {
      const { readFileSync, existsSync } = await import('fs');
      const { join } = await import('path');

      const usagePath = join(__dirname, '..', 'data', 'usage.json');
      if (!existsSync(usagePath)) {
        console.log('No usage.json found.');
        return;
      }

      const data = JSON.parse(readFileSync(usagePath, 'utf-8'));
      const accounts = Object.values(data.accounts || {}) as {
        id: string;
        usagePercent: number;
        resetTime: string;
        claudeCodeFirstTokenDate: string;
        lastUpdated: string;
        notes?: string;
      }[];

      if (accounts.length === 0) {
        console.log('No accounts found.');
        return;
      }

      console.log('Claude API Accounts\n');
      for (const a of accounts) {
        const reset = new Date(a.resetTime).toISOString().slice(0, 10);
        const bar = '█'.repeat(Math.floor(a.usagePercent / 10)) + '░'.repeat(10 - Math.floor(a.usagePercent / 10));
        console.log(`  ${a.id.padEnd(12)}  ${bar} ${a.usagePercent}%  reset: ${reset}${a.notes ? `  (${a.notes})` : ''}`);
      }
    });

  // --- dashboard:rates ---
  program
    .command('dashboard:rates')
    .description('Show rate limit buckets')
    .action(async () => {
      const { getDb } = await import('./db/migrate');

      const db = getDb();
      const buckets = db.prepare('SELECT * FROM rate_limit_buckets').all() as {
        service: string;
        tokens: number;
        last_refill_at: number;
        rate_per_minute: number;
      }[];

      const concurrency = db.prepare('SELECT service, COUNT(*) as count FROM rate_limit_concurrency GROUP BY service').all() as {
        service: string;
        count: number;
      }[];

      if (buckets.length === 0 && concurrency.length === 0) {
        console.log('No rate limit data found.');
        return;
      }

      console.log('Rate Limit Status\n');

      if (buckets.length > 0) {
        console.log('Token Buckets (RPM):');
        for (const b of buckets) {
          const pct = Math.round((b.tokens / b.rate_per_minute) * 100);
          console.log(`  ${b.service.padEnd(15)}  ${Math.floor(b.tokens)}/${b.rate_per_minute} tokens (${pct}%)`);
        }
        console.log('');
      }

      if (concurrency.length > 0) {
        console.log('Concurrency:');
        for (const c of concurrency) {
          console.log(`  ${c.service.padEnd(15)}  ${c.count} in flight`);
        }
      }
    });

  // --- dashboard:kill ---
  program
    .command('dashboard:kill')
    .description('Show kill switch status')
    .action(() => {
      const killStates = getKillSwitchStates();
      if (killStates.length === 0) {
        console.log('No kill switches configured.');
        return;
      }

      console.log('Kill Switch Status\n');
      for (const k of killStates) {
        const name = k.service === '__global__' ? 'GLOBAL' : k.service;
        const status = k.active ? '🔴 ACTIVE' : '🟢 inactive';
        const reason = k.reason ? ` — ${k.reason}` : '';
        console.log(`  ${name.padEnd(15)}  ${status}${reason}`);
      }
    });

  // --- launch ---
  program
    .command('launch')
    .description('Launch Claude Code with optimal account selection')
    .option('-a, --account <name>', 'Use specific account (skip selection)')
    .option('-p, --project <path>', 'Project directory', process.cwd())
    .option('--no-skip-permissions', 'Run without --dangerously-skip-permissions')
    .option('--dry-run', 'Show what would be launched without launching')
    .argument('[args...]', 'Additional args to pass to claude')
    .allowUnknownOption()
    .passThroughOptions()
    .action(async (args: string[], opts: { account?: string; project?: string; skipPermissions?: boolean; dryRun?: boolean }) => {
      const { launchClaude } = await import('./launch');
      const result = await launchClaude({
        account: opts.account,
        project: opts.project,
        skipPermissions: opts.skipPermissions === false, // --no-skip-permissions sets to false
        passthroughArgs: args,
        dryRun: opts.dryRun,
      });
      if (!result.success && result.error) {
        console.error(`ERROR: ${result.error}`);
      }
      process.exit(result.exitCode ?? (result.success ? 0 : 1));
    });

  // --- dashboard:webhooks ---
  program
    .command('dashboard:webhooks')
    .description('Show webhook events (AgentMail, Polaris)')
    .option('-l, --limit <n>', 'Number of entries', '20')
    .option('-m, --mailbox <id>', 'Filter by mailbox ID')
    .option('-t, --type <type>', 'Filter by event type')
    .action(async (opts: { limit: string; mailbox?: string; type?: string }) => {
      const { getEvents, initWebhooksDb } = await import('./db/webhooks');

      initWebhooksDb();
      const events = getEvents({
        limit: parseInt(opts.limit, 10),
        mailbox_id: opts.mailbox,
      });

      // Filter by type if specified
      const filtered = opts.type
        ? events.filter(e => e.event_type.includes(opts.type!))
        : events;

      if (filtered.length === 0) {
        console.log('No webhook events found.');
        return;
      }

      console.log('Webhook Events\n');
      for (const e of filtered) {
        const time = e.received_at.slice(0, 19);
        const type = e.event_type.padEnd(20);
        const mailbox = e.mailbox_id ? e.mailbox_id.slice(0, 12) : '-'.padEnd(12);
        const msg = e.message_id ? e.message_id.slice(0, 12) : '-';
        console.log(`  ${time}  ${type}  ${mailbox}  ${msg}`);
      }

      // Show summary by type
      const byType = new Map<string, number>();
      for (const e of events) {
        byType.set(e.event_type, (byType.get(e.event_type) || 0) + 1);
      }
      if (byType.size > 1) {
        console.log('\nBy type:');
        for (const [type, count] of byType) {
          console.log(`  ${type}: ${count}`);
        }
      }
    });

  program.commands.forEach((cmd) => cmd.showHelpAfterError(true));
  program.parse(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
