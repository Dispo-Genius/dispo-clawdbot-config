import { spawn } from 'child_process';
import { existsSync } from 'fs';
import type { ServiceConfig } from '../config/loader';
import { resolveToolEntryPoint } from '../config/loader';
import { getKey } from '../utils/keychain';
import type { ClientContext } from '../config/clients';

export interface ExecResult {
  exitCode: number;
  durationMs: number;
  output?: string; // Captured output (for server mode)
}

/**
 * Execute a service command - routes to local or remote execution based on config.
 */
export function execTool(
  config: ServiceConfig,
  command: string,
  args: string[]
): Promise<ExecResult> {
  if (config.execution.type === 'remote') {
    return execRemote(config, command, args);
  }
  return execLocal(config, command, args);
}

/**
 * Execute command on remote gateway server via HTTP.
 */
async function execRemote(
  config: ServiceConfig,
  command: string,
  args: string[]
): Promise<ExecResult> {
  const { host, port, token } = config.execution;

  if (!host || !token) {
    throw new Error(
      `Remote execution configured but missing host or token for service "${config.name}"`
    );
  }

  const url = `http://${host}:${port ?? 4100}/exec`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        service: config.name,
        command,
        args,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      // Handle HTTP error responses
      const errorText = await response.text();

      if (response.status === 401) {
        throw new Error(`Remote gateway authentication failed: ${errorText}`);
      }
      if (response.status === 503) {
        throw new Error(`Remote gateway service unavailable: ${errorText}`);
      }
      if (response.status === 429) {
        throw new Error(`Remote gateway rate limited: ${errorText}`);
      }

      throw new Error(`Remote gateway error (${response.status}): ${errorText}`);
    }

    // Get response body
    const body = await response.text();

    // Get exit code from header (new format) or parse from JSON body (old format)
    const exitCodeHeader = response.headers.get('X-Exit-Code');
    let exitCode = 0;
    let output = body;

    if (exitCodeHeader) {
      // New format: plain text body with exit code in header
      exitCode = parseInt(exitCodeHeader, 10);
    } else if (body) {
      // Old format: JSON body with exitCode field
      try {
        const json = JSON.parse(body);
        exitCode = json.exitCode ?? (json.success ? 0 : 1);
        // For old format, output is in the 'output' field, or just show nothing
        output = json.output ?? '';
      } catch {
        // Not JSON, treat as plain text output
        output = body;
      }
    }

    // Stream output to stdout
    if (output) {
      process.stdout.write(output);
    }

    return { exitCode, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;

    if (err instanceof TypeError && (err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to remote gateway at ${host}:${port ?? 4100}. Is the gateway server running?`);
    }

    if (err instanceof Error) {
      throw err;
    }

    throw new Error(`Remote execution failed: ${String(err)}`);
  }
}

/**
 * Spawn the target tool as a child process, streaming stdout/stderr to the caller.
 * Only injects env vars listed in the service's authVars config.
 */
/**
 * Execute locally, streaming to stdout/stderr (CLI mode).
 */
function execLocal(
  config: ServiceConfig,
  command: string,
  args: string[]
): Promise<ExecResult> {
  return execLocalImpl(config, command, args, false);
}

/**
 * Execute locally, capturing output (server mode).
 */
export function execLocalCapture(
  config: ServiceConfig,
  command: string,
  args: string[],
  clientContext?: ClientContext
): Promise<ExecResult> {
  return execLocalImpl(config, command, args, true, clientContext);
}

function execLocalImpl(
  config: ServiceConfig,
  command: string,
  args: string[],
  captureOutput: boolean,
  clientContext?: ClientContext
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const entryPoint = resolveToolEntryPoint(config);

    if (!existsSync(entryPoint)) {
      reject(new Error(`Tool entry point not found: ${entryPoint}`));
      return;
    }

    // Build filtered env: start with process.env, then overlay auth vars from secure store
    const childEnv: Record<string, string> = {
      ...process.env as Record<string, string>,
    };

    // Inject client context for tools that need it
    if (clientContext) {
      childEnv._GATEWAY_CLIENT_ID = clientContext.id;
      childEnv._GATEWAY_CLIENT_NAME = clientContext.name;
    }

    // Get auth vars from secure credential store
    // Profile lookup: profile creds → profile keychain → global keychain → credentials.json → env
    const missingVars: string[] = [];
    for (const varName of config.authVars) {
      const keyValue = getKey(varName, clientContext?.profile);
      if (!keyValue) {
        missingVars.push(varName);
      } else {
        // Inject the key from secure store into child env
        childEnv[varName] = keyValue;
      }
    }

    if (missingVars.length > 0) {
      reject(
        new Error(
          `Missing required credentials for ${config.tool}: ${missingVars.join(', ')}. ` +
          `Add to keychain (security add-generic-password) or ~/.clawdbot/credentials.json`
        )
      );
      return;
    }

    const startTime = Date.now();
    let output = '';

    const child = spawn('npx', ['tsx', entryPoint, command, ...args], {
      env: childEnv,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });

    if (captureOutput) {
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
    } else {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn tool process: ${err.message}`));
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        exitCode: code ?? 1,
        durationMs,
        output: captureOutput ? output : undefined,
      });
    });
  });
}
