import { spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Session, SessionStatus, SpawnRequest, SessionResult, ClaudeCodeOutput } from './types';

const SESSIONS_DIR = '/tmp/claude-code-sessions';
const ALLOWED_CWDS = [
  '/Users/polaris/projects',
  '/Users/polaris/workspace',
  '/tmp'
];
const MAX_CONCURRENT = 2;
const DEFAULT_TIMEOUT = 600;
const MAX_TIMEOUT = 3600;

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private processes: Map<string, ChildProcess> = new Map();

  constructor() {
    if (!existsSync(SESSIONS_DIR)) {
      mkdirSync(SESSIONS_DIR, { recursive: true });
    }
    this.loadSessions();
  }

  // Validate cwd against allowlist
  validateCwd(cwd: string): boolean {
    return ALLOWED_CWDS.some(allowed =>
      cwd === allowed || cwd.startsWith(allowed + '/')
    );
  }

  // Get allowed directories for error messages
  getAllowedCwds(): string[] {
    return ALLOWED_CWDS.map(d => d + '/*');
  }

  // Check concurrent session limit
  canSpawn(): boolean {
    const running = [...this.sessions.values()]
      .filter(s => s.status === 'running' || s.status === 'pending').length;
    return running < MAX_CONCURRENT;
  }

  // Create new session
  async spawn(request: SpawnRequest): Promise<Session> {
    const id = randomUUID();
    const sessionDir = join(SESSIONS_DIR, id);
    mkdirSync(sessionDir);

    const session: Session = {
      id,
      status: 'pending',
      prompt: request.prompt,
      cwd: request.cwd,
      model: request.model || 'sonnet',
      timeout: Math.min(request.timeout || DEFAULT_TIMEOUT, MAX_TIMEOUT),
      createdAt: new Date().toISOString(),
      callbackUrl: request.callbackUrl
    };

    this.sessions.set(id, session);
    this.saveSession(session);

    // Spawn Claude Code in background
    this.executeSession(session, request);

    return session;
  }

  private async executeSession(session: Session, request: SpawnRequest): Promise<void> {
    const sessionDir = join(SESSIONS_DIR, session.id);
    const outputFile = join(sessionDir, 'output.json');
    const pidFile = join(sessionDir, 'pid');
    const logFile = join(sessionDir, 'log.txt');

    const args = [
      '-p', request.prompt,
      '--print',
      '--output-format', 'json',
      '--model', session.model
    ];

    // Permission mode: bypassPermissions for unattended execution
    const permMode = request.permissionMode || 'bypassPermissions';
    if (permMode === 'bypassPermissions') {
      args.push('--dangerously-skip-permissions');
    } else if (permMode === 'plan') {
      args.push('--permission-mode', 'plan');
    }
    // 'default' doesn't need a flag

    if (request.allowedTools?.length) {
      args.push('--allowed-tools', request.allowedTools.join(','));
    }

    if (request.systemPrompt) {
      args.push('--append-system-prompt', request.systemPrompt);
    }

    console.log(`[claude-code] Spawning session ${session.id} in ${request.cwd}`);
    console.log(`[claude-code] Command: claude ${args.slice(0, 4).join(' ')}...`);

    const child = spawn('claude', args, {
      cwd: request.cwd,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    child.unref();
    this.processes.set(session.id, child);

    // Save PID for kill
    if (child.pid) {
      writeFileSync(pidFile, String(child.pid));
    }

    session.status = 'running';
    session.startedAt = new Date().toISOString();
    session.pid = child.pid;
    this.saveSession(session);

    // Collect output
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data; });
    child.stderr?.on('data', (data) => { stderr += data; });

    // Set timeout
    const timer = setTimeout(() => {
      console.log(`[claude-code] Session ${session.id} timed out after ${session.timeout}s`);
      this.killSession(session.id, 'timeout');
    }, session.timeout * 1000);
    this.timers.set(session.id, timer);

    // Handle completion
    child.on('close', (code) => {
      const timer = this.timers.get(session.id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(session.id);
      }
      this.processes.delete(session.id);

      session.completedAt = new Date().toISOString();
      session.exitCode = code ?? undefined;

      // Don't override status if already set to killed/timeout
      if (session.status === 'running') {
        session.status = code === 0 ? 'completed' : 'failed';
      }

      // Write output
      writeFileSync(outputFile, stdout);
      writeFileSync(logFile, stderr);

      console.log(`[claude-code] Session ${session.id} finished with status ${session.status}`);
      this.saveSession(session);
      this.sendCallback(session);
    });

    child.on('error', (err) => {
      console.error(`[claude-code] Session ${session.id} spawn error: ${err.message}`);
      session.status = 'failed';
      session.error = err.message;
      session.completedAt = new Date().toISOString();
      this.saveSession(session);
    });
  }

  // Get session by ID
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  // Get session result with output
  getSessionResult(id: string): SessionResult | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const outputFile = join(SESSIONS_DIR, id, 'output.json');
    let output: ClaudeCodeOutput | undefined;
    let rawOutput: string | undefined;

    if (existsSync(outputFile)) {
      rawOutput = readFileSync(outputFile, 'utf-8');
      try {
        // Claude Code may output multiple JSON lines, take the last complete one
        const lines = rawOutput.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.type === 'result') {
              output = parsed;
              break;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Keep rawOutput for debugging
      }
    }

    return { session, output, rawOutput };
  }

  // List sessions
  listSessions(status?: SessionStatus): Session[] {
    const all = [...this.sessions.values()];
    const filtered = status ? all.filter(s => s.status === status) : all;
    // Sort by createdAt descending
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Kill session
  killSession(id: string, reason: 'manual' | 'timeout' = 'manual'): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    // Try to kill the process
    const child = this.processes.get(id);
    if (child && child.pid) {
      try {
        process.kill(child.pid, 'SIGTERM');
      } catch {
        // Process may have already exited
      }
    } else if (session.pid) {
      try {
        process.kill(session.pid, 'SIGTERM');
      } catch {
        // Process may have already exited
      }
    }

    session.status = reason === 'timeout' ? 'timeout' : 'killed';
    session.completedAt = new Date().toISOString();
    this.saveSession(session);

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.processes.delete(id);
    console.log(`[claude-code] Session ${id} killed (${reason})`);

    return true;
  }

  // Cleanup old sessions (call periodically)
  cleanup(maxAgeHours: number = 24): { deleted: number } {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let deleted = 0;

    for (const [id, session] of this.sessions) {
      if (new Date(session.createdAt).getTime() < cutoff) {
        this.sessions.delete(id);

        // Delete session directory
        const sessionDir = join(SESSIONS_DIR, id);
        try {
          rmSync(sessionDir, { recursive: true, force: true });
        } catch {
          // Ignore deletion errors
        }
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[claude-code] Cleaned up ${deleted} old sessions`);
    }

    return { deleted };
  }

  private saveSession(session: Session): void {
    const sessionDir = join(SESSIONS_DIR, session.id);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    const metaFile = join(sessionDir, 'meta.json');
    writeFileSync(metaFile, JSON.stringify(session, null, 2));
  }

  private loadSessions(): void {
    if (!existsSync(SESSIONS_DIR)) return;

    const dirs = readdirSync(SESSIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const id of dirs) {
      const metaFile = join(SESSIONS_DIR, id, 'meta.json');
      if (existsSync(metaFile)) {
        try {
          const session: Session = JSON.parse(readFileSync(metaFile, 'utf-8'));

          // Mark running sessions as failed on restart (process was lost)
          if (session.status === 'running' || session.status === 'pending') {
            session.status = 'failed';
            session.error = 'Gateway restarted';
            session.completedAt = new Date().toISOString();
            this.saveSession(session);
          }

          this.sessions.set(id, session);
        } catch {
          // Ignore malformed session files
        }
      }
    }

    console.log(`[claude-code] Loaded ${this.sessions.size} sessions from disk`);
  }

  private async sendCallback(session: Session): Promise<void> {
    if (!session.callbackUrl) return;

    try {
      const result = this.getSessionResult(session.id);
      await fetch(session.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      console.log(`[claude-code] Callback sent for session ${session.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[claude-code] Callback failed for session ${session.id}: ${msg}`);
    }
  }
}

export const sessionManager = new SessionManager();
