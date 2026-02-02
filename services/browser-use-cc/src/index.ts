#!/usr/bin/env node

import { Command } from 'commander';
import { spawn, execSync, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const CDP_PORT = 9222;
const PROFILE_PATH = `${process.env.HOME}/.config/brave-cdp-profile`;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const GRACE_PERIOD_MS = 5000;

interface RunOptions {
  task: string;
  timeout?: number;
  headless?: boolean;
  screenshot?: string;
}

interface RunResult {
  success: boolean;
  output?: string;
  error?: string;
  screenshotPath?: string;
}

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, 'localhost');
  });
}

async function ensureBraveRunning(headless: boolean): Promise<void> {
  // Check if Brave is installed
  if (!existsSync(BRAVE_PATH)) {
    throw new Error(
      `Brave not found at ${BRAVE_PATH}. Install from https://brave.com`
    );
  }

  // Check if CDP port is already in use
  const portInUse = await checkPort(CDP_PORT);
  if (portInUse) {
    // Verify it's actually Brave responding
    try {
      const response = await fetch(`http://localhost:${CDP_PORT}/json/version`);
      if (response.ok) {
        return; // Brave already running with CDP
      }
    } catch {
      throw new Error(
        `Port ${CDP_PORT} in use but not responding to CDP. Run: lsof -i :${CDP_PORT}`
      );
    }
  }

  // Launch Brave with CDP
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE_PATH}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (headless) {
    args.push('--headless=new');
  }

  const brave = spawn(BRAVE_PATH, args, {
    detached: true,
    stdio: 'ignore',
  });
  brave.unref();

  // Wait for CDP to be ready
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const ready = await checkPort(CDP_PORT);
    if (ready) {
      try {
        const response = await fetch(`http://localhost:${CDP_PORT}/json/version`);
        if (response.ok) {
          return;
        }
      } catch {
        // Keep waiting
      }
    }
  }

  throw new Error('Brave failed to start with CDP enabled');
}

function findPythonWithBrowserUse(): string {
  // Check common venv locations for browser-use
  const venvLocations = [
    `${process.env.HOME}/clawd/skills/agent-browser/venv/bin/python`,
    `${process.env.HOME}/.venv/bin/python`,
    `${process.env.HOME}/venv/bin/python`,
  ];

  for (const pythonPath of venvLocations) {
    if (existsSync(pythonPath)) {
      try {
        execSync(`${pythonPath} -c "import browser_use"`, { stdio: 'pipe' });
        return pythonPath;
      } catch {
        // browser-use not in this venv
      }
    }
  }

  // Fall back to system python3
  try {
    execSync('python3 -c "import browser_use"', { stdio: 'pipe' });
    return 'python3';
  } catch {
    throw new Error(
      'browser-use not found. Run: pip install browser-use'
    );
  }
}

async function runBrowserTask(options: RunOptions): Promise<RunResult> {
  const timeoutMs = (options.timeout ?? 300) * 1000;
  const runnerPath = join(__dirname, 'runner.py');

  // Check Python runner exists
  if (!existsSync(runnerPath)) {
    throw new Error(`Python runner not found at ${runnerPath}`);
  }

  // Find Python with browser-use installed
  const pythonPath = findPythonWithBrowserUse();

  // Ensure Brave is running
  await ensureBraveRunning(options.headless ?? false);

  // Build environment
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    CDP_PORT: String(CDP_PORT),
    TASK: options.task,
  };

  if (options.screenshot) {
    env.SCREENSHOT_PATH = options.screenshot;
  }

  // Get API keys from environment (passed by gateway)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    env.ANTHROPIC_API_KEY = anthropicKey;
  } else {
    throw new Error('ANTHROPIC_API_KEY not set. Required for browser-use.');
  }

  const capsolverKey = process.env.CAPSOLVER_API_KEY;
  if (capsolverKey) {
    env.CAPSOLVER_API_KEY = capsolverKey;
  } else {
    console.error('Warning: CAPSOLVER_API_KEY not set. CAPTCHA solving will fail.');
  }

  // Spawn Python runner
  return new Promise((resolve) => {
    let output = '';
    let killed = false;

    const python = spawn(pythonPath, [runnerPath], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeoutId = setTimeout(() => {
      killed = true;
      python.kill('SIGTERM');
      setTimeout(() => {
        if (!python.killed) {
          python.kill('SIGKILL');
        }
      }, GRACE_PERIOD_MS);
    }, timeoutMs);

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      output += data.toString();
    });

    python.on('close', (code) => {
      clearTimeout(timeoutId);

      if (killed) {
        resolve({
          success: false,
          error: `Task timed out after ${timeoutMs / 1000} seconds`,
          output,
        });
        return;
      }

      if (code === 0) {
        resolve({
          success: true,
          output,
          screenshotPath: options.screenshot,
        });
      } else {
        resolve({
          success: false,
          error: `Python runner exited with code ${code}`,
          output,
        });
      }
    });

    python.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}

async function getStatus(): Promise<object> {
  const braveInstalled = existsSync(BRAVE_PATH);
  const cdpRunning = await checkPort(CDP_PORT);

  let browserUseInstalled = false;
  let pythonPath: string | null = null;
  try {
    pythonPath = findPythonWithBrowserUse();
    browserUseInstalled = true;
  } catch {
    // Not installed in any known location
  }

  const capsolverKey = process.env.CAPSOLVER_API_KEY;

  return {
    brave: {
      installed: braveInstalled,
      path: BRAVE_PATH,
      cdpRunning,
      cdpPort: CDP_PORT,
    },
    browserUse: {
      installed: browserUseInstalled,
      pythonPath,
    },
    capsolver: {
      configured: !!capsolverKey,
    },
    profile: {
      path: PROFILE_PATH,
    },
  };
}

const program = new Command();

program
  .name('browser-use-cc')
  .description('AI-driven browser automation via browser-use')
  .version('1.0.0');

program
  .command('run')
  .description('Execute an AI-driven browser task')
  .requiredOption('--task <task>', 'Task description for the AI')
  .option('--timeout <seconds>', 'Timeout in seconds', '300')
  .option('--headless', 'Run browser in headless mode')
  .option('--screenshot <path>', 'Save screenshot after task completion')
  .action(async (options) => {
    try {
      const result = await runBrowserTask({
        task: options.task,
        timeout: parseInt(options.timeout, 10),
        headless: options.headless,
        screenshot: options.screenshot,
      });

      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (err) {
      console.log(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }, null, 2)
      );
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check browser-use dependencies and status')
  .action(async () => {
    const status = await getStatus();
    console.log(JSON.stringify(status, null, 2));
  });

program.parse();
