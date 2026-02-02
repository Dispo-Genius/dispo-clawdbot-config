import { Command } from 'commander';
import { output, errorOutput, getFormat } from '../utils/output';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://polariss-mac-mini-1:4100';

async function gatewayFetch(path: string, options?: RequestInit): Promise<unknown> {
  const token = process.env.CC_CLIENT_KEY || process.env.CC_CLIENT_KEY_LAPTOP;
  if (!token) {
    throw new Error('CC_CLIENT_KEY or CC_CLIENT_KEY_LAPTOP required');
  }

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error || `Gateway error: ${res.status}`);
  }

  return res.json();
}

interface SpawnResponse {
  sessionId: string;
  status: string;
  createdAt: string;
}

interface Session {
  id: string;
  status: string;
  cwd: string;
  model: string;
  createdAt: string;
  completedAt?: string;
  exitCode?: number;
  error?: string;
}

interface SessionOutput {
  type: string;
  subtype: string;
  result?: string;
  is_error: boolean;
  cost_usd: number;
  duration_ms: number;
  num_turns: number;
}

interface SessionResult {
  session: Session;
  output?: SessionOutput;
  rawOutput?: string;
}

interface ListResponse {
  sessions: Session[];
}

export const code = new Command('code')
  .description('Claude Code session management');

// spawn subcommand
code
  .command('spawn')
  .description('Spawn a new Claude Code session')
  .argument('<prompt>', 'Task prompt for Claude Code')
  .requiredOption('--cwd <path>', 'Working directory')
  .option('--model <model>', 'Model: sonnet, opus, haiku', 'sonnet')
  .option('--timeout <seconds>', 'Timeout in seconds', '600')
  .option('--permission-mode <mode>', 'Permission mode: bypassPermissions, default, plan', 'bypassPermissions')
  .option('--wait', 'Wait for completion and return result')
  .option('--poll-interval <ms>', 'Poll interval when waiting', '5000')
  .action(async (prompt: string, options: {
    cwd: string;
    model: string;
    timeout: string;
    permissionMode: string;
    wait?: boolean;
    pollInterval: string;
  }) => {
    try {
      const result = await gatewayFetch('/claude-code/spawn', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          cwd: options.cwd,
          model: options.model,
          timeout: parseInt(options.timeout, 10),
          permissionMode: options.permissionMode
        })
      }) as SpawnResponse;

      if (options.wait) {
        // Poll for completion
        const interval = parseInt(options.pollInterval, 10);
        const terminalStates = ['completed', 'failed', 'killed', 'timeout'];

        while (true) {
          await new Promise(r => setTimeout(r, interval));

          const status = await gatewayFetch(`/claude-code/sessions/${result.sessionId}`) as SessionResult;

          if (terminalStates.includes(status.session.status)) {
            if (getFormat() === 'json') {
              output(JSON.stringify(status, null, 2));
            } else {
              output(`status:${status.session.status}`);
              if (status.session.exitCode !== undefined) {
                output(`exit_code:${status.session.exitCode}`);
              }
              if (status.output?.result) {
                output(`result:${status.output.result}`);
              }
              if (status.output?.cost_usd) {
                output(`cost:$${status.output.cost_usd.toFixed(4)}`);
              }
            }
            return;
          }
        }
      } else {
        if (getFormat() === 'json') {
          output(JSON.stringify(result, null, 2));
        } else {
          output(`spawned:${result.sessionId}`);
        }
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

// status subcommand
code
  .command('status')
  .description('Get session status and result')
  .argument('<sessionId>', 'Session ID')
  .action(async (sessionId: string) => {
    try {
      const result = await gatewayFetch(`/claude-code/sessions/${sessionId}`) as SessionResult;

      if (getFormat() === 'json') {
        output(JSON.stringify(result, null, 2));
      } else {
        output(`status:${result.session.status}`);
        if (result.session.exitCode !== undefined) {
          output(`exit_code:${result.session.exitCode}`);
        }
        if (result.output?.result) {
          // Truncate long results in compact mode
          const truncated = result.output.result.length > 500
            ? result.output.result.substring(0, 500) + '...'
            : result.output.result;
          output(`result:${truncated}`);
        }
        if (result.output?.cost_usd) {
          output(`cost:$${result.output.cost_usd.toFixed(4)}`);
        }
        if (result.session.error) {
          output(`error:${result.session.error}`);
        }
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

// list subcommand
code
  .command('list')
  .description('List Claude Code sessions')
  .option('--status <status>', 'Filter by status: pending, running, completed, failed, killed, timeout')
  .action(async (options: { status?: string }) => {
    try {
      const query = options.status ? `?status=${options.status}` : '';
      const result = await gatewayFetch(`/claude-code/sessions${query}`) as ListResponse;

      if (getFormat() === 'json') {
        output(JSON.stringify(result, null, 2));
      } else {
        if (result.sessions.length === 0) {
          output('No sessions found');
          return;
        }
        for (const s of result.sessions) {
          const completedAt = s.completedAt ? ` completed:${s.completedAt}` : '';
          output(`${s.id.substring(0, 8)}:${s.status}:${s.model}:${s.cwd}${completedAt}`);
        }
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

// kill subcommand
code
  .command('kill')
  .description('Kill a running session')
  .argument('<sessionId>', 'Session ID')
  .action(async (sessionId: string) => {
    try {
      await gatewayFetch(`/claude-code/sessions/${sessionId}`, { method: 'DELETE' });
      output('killed');
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

// cleanup subcommand
code
  .command('cleanup')
  .description('Cleanup old sessions')
  .option('--max-age <hours>', 'Max age in hours', '24')
  .action(async (options: { maxAge: string }) => {
    try {
      const result = await gatewayFetch('/claude-code/cleanup', {
        method: 'POST',
        body: JSON.stringify({ maxAgeHours: parseInt(options.maxAge, 10) })
      }) as { deleted: number };

      if (getFormat() === 'json') {
        output(JSON.stringify(result, null, 2));
      } else {
        output(`deleted:${result.deleted}`);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
