// ggshield and trufflehog wrapper utilities

import { spawn, spawnSync } from 'child_process';
import * as path from 'path';

export interface GGShieldResult {
  success: boolean;
  secretsFound: number;
  output: string;
  details?: unknown[];
  error?: string;
}

export interface TruffleHogResult {
  success: boolean;
  secretsFound: number;
  output: string;
  findings?: unknown[];
  error?: string;
}

export function isGGShieldInstalled(): boolean {
  const result = spawnSync('which', ['ggshield']);
  return result.status === 0;
}

export function isTruffleHogInstalled(): boolean {
  const result = spawnSync('which', ['trufflehog']);
  return result.status === 0;
}

export async function runGGShieldScan(targetPath: string): Promise<GGShieldResult> {
  if (!isGGShieldInstalled()) {
    return {
      success: false,
      secretsFound: 0,
      output: '',
      error: 'ggshield not installed. Run: brew install gitguardian/tap/ggshield',
    };
  }

  return new Promise((resolve) => {
    const args = ['secret', 'scan', 'path', targetPath, '--recursive', '--json'];
    const proc = spawn('ggshield', args, {
      cwd: targetPath,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // ggshield returns exit code 1 if secrets found, 0 if clean
      if (code === 0) {
        resolve({
          success: true,
          secretsFound: 0,
          output: stdout || 'No secrets found.',
        });
      } else if (code === 1) {
        // Secrets found - try to parse JSON output
        let details: unknown[] = [];
        let secretsFound = 0;

        try {
          const parsed = JSON.parse(stdout);
          if (parsed.results) {
            details = parsed.results;
            // Count unique incidents
            secretsFound = parsed.results.reduce((acc: number, r: { incidents?: unknown[] }) => {
              return acc + (r.incidents?.length || 0);
            }, 0);
          }
        } catch {
          // If JSON parsing fails, estimate from output
          secretsFound = (stdout.match(/Secret detected/gi) || []).length || 1;
        }

        resolve({
          success: true,
          secretsFound,
          output: stdout,
          details,
        });
      } else {
        resolve({
          success: false,
          secretsFound: 0,
          output: stderr || stdout,
          error: `ggshield exited with code ${code}`,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        secretsFound: 0,
        output: '',
        error: err.message,
      });
    });
  });
}

export async function runTruffleHogScan(
  targetPath: string,
  onlyVerified: boolean = false
): Promise<TruffleHogResult> {
  if (!isTruffleHogInstalled()) {
    return {
      success: false,
      secretsFound: 0,
      output: '',
      error: 'trufflehog not installed. Run: brew install trufflehog',
    };
  }

  return new Promise((resolve) => {
    const args = ['git', `file://${targetPath}`, '--json'];
    if (onlyVerified) {
      args.push('--only-verified');
    }

    const proc = spawn('trufflehog', args, {
      cwd: targetPath,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // Parse JSONL output (one JSON object per line)
      const findings: unknown[] = [];
      const lines = stdout.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          findings.push(JSON.parse(line));
        } catch {
          // Skip non-JSON lines
        }
      }

      if (code === 0 || findings.length > 0) {
        resolve({
          success: true,
          secretsFound: findings.length,
          output: stdout,
          findings,
        });
      } else {
        resolve({
          success: false,
          secretsFound: 0,
          output: stderr || stdout,
          error: code !== 0 ? `trufflehog exited with code ${code}` : undefined,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        secretsFound: 0,
        output: '',
        error: err.message,
      });
    });
  });
}

export function getPreCommitHookPath(repoPath: string): string {
  return path.join(repoPath, '.git', 'hooks', 'pre-commit');
}

export function hasGitDirectory(repoPath: string): boolean {
  const gitDir = path.join(repoPath, '.git');
  try {
    const fs = require('fs');
    return fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory();
  } catch {
    return false;
  }
}
