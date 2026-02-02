import { execSync } from 'child_process';
import { git, gitRaw, getCurrentBranch, getGitDir } from '../api/git';
import type { GitStatus, StatusFile, DiffStats, ConflictFile } from '../types';

/**
 * Check if currently in a rebase
 */
export function isInRebase(): { inRebase: boolean; step?: number; total?: number } {
  try {
    const gitDir = getGitDir();
    const rebaseMerge = `${gitDir}/rebase-merge`;
    const rebaseApply = `${gitDir}/rebase-apply`;

    // Check rebase-merge directory (interactive rebase)
    try {
      const msgnum = execSync(`cat "${rebaseMerge}/msgnum" 2>/dev/null`, { encoding: 'utf-8' }).trim();
      const end = execSync(`cat "${rebaseMerge}/end" 2>/dev/null`, { encoding: 'utf-8' }).trim();
      return { inRebase: true, step: parseInt(msgnum), total: parseInt(end) };
    } catch {
      // Not interactive rebase, check rebase-apply
    }

    // Check rebase-apply directory (am-style rebase)
    try {
      const next = execSync(`cat "${rebaseApply}/next" 2>/dev/null`, { encoding: 'utf-8' }).trim();
      const last = execSync(`cat "${rebaseApply}/last" 2>/dev/null`, { encoding: 'utf-8' }).trim();
      return { inRebase: true, step: parseInt(next), total: parseInt(last) };
    } catch {
      // Not in rebase
    }

    return { inRebase: false };
  } catch {
    return { inRebase: false };
  }
}

/**
 * Check if in merge state
 */
export function isInMerge(): boolean {
  try {
    const gitDir = getGitDir();
    execSync(`test -f "${gitDir}/MERGE_HEAD"`, { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse git status --porcelain=v1 output
 */
function parseStatusLine(line: string): StatusFile | null {
  if (line.length < 4) return null;

  const indexStatus = line[0];
  const workTreeStatus = line[1];
  const path = line.slice(3);

  // Untracked
  if (indexStatus === '?' && workTreeStatus === '?') {
    return { status: '?', path, staged: false };
  }

  // Conflict (both modified)
  if ((indexStatus === 'U' || workTreeStatus === 'U') ||
      (indexStatus === 'A' && workTreeStatus === 'A') ||
      (indexStatus === 'D' && workTreeStatus === 'D')) {
    return { status: 'U', path, staged: false };
  }

  // Staged
  if (indexStatus !== ' ' && indexStatus !== '?') {
    return { status: indexStatus as StatusFile['status'], path, staged: true };
  }

  // Unstaged
  if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
    return { status: workTreeStatus as StatusFile['status'], path, staged: false };
  }

  return null;
}

/**
 * Get full git status
 */
export function getStatus(): GitStatus {
  const branch = getCurrentBranch();
  const rebaseState = isInRebase();

  // Get upstream tracking info
  let upstream: string | undefined;
  let ahead = 0;
  let behind = 0;

  try {
    upstream = gitRaw('rev-parse --abbrev-ref @{upstream}', { throwOnError: false });
    if (upstream) {
      const counts = gitRaw('rev-list --left-right --count HEAD...@{upstream}', { throwOnError: false });
      if (counts) {
        const [aheadStr, behindStr] = counts.split('\t');
        ahead = parseInt(aheadStr) || 0;
        behind = parseInt(behindStr) || 0;
      }
    }
  } catch {
    // No upstream
  }

  // Parse status
  const statusOutput = git(['status', '--porcelain=v1'], { throwOnError: false });
  const lines = statusOutput ? statusOutput.split('\n') : [];

  const staged: StatusFile[] = [];
  const modified: StatusFile[] = [];
  const untracked: StatusFile[] = [];
  const conflicts: StatusFile[] = [];

  for (const line of lines) {
    const file = parseStatusLine(line);
    if (!file) continue;

    if (file.status === 'U') {
      conflicts.push(file);
    } else if (file.status === '?') {
      untracked.push(file);
    } else if (file.staged) {
      staged.push(file);
    } else {
      modified.push(file);
    }
  }

  const isClean = staged.length === 0 &&
                   modified.length === 0 &&
                   untracked.length === 0 &&
                   conflicts.length === 0;

  return {
    branch,
    upstream,
    ahead,
    behind,
    staged,
    modified,
    untracked,
    conflicts,
    isRebase: rebaseState.inRebase,
    rebaseStep: rebaseState.step,
    rebaseTotal: rebaseState.total,
    isClean,
  };
}

/**
 * Get diff stats
 */
export function getDiffStats(staged?: boolean, target?: string): DiffStats {
  const args = ['diff', '--stat', '--stat-width=200'];
  if (staged) {
    args.splice(1, 0, '--cached');
  }
  if (target) {
    args.splice(1, 0, target);
  }

  const output = git(args, { throwOnError: false });
  if (!output) {
    return { additions: 0, deletions: 0, files: 0, fileStats: [] };
  }

  const lines = output.split('\n');
  const fileStats: DiffStats['fileStats'] = [];

  // Parse file lines (all but last line which is summary)
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    // Match: " filename | 5 ++--"
    const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)/);
    if (match) {
      const file = match[1].trim();
      // Count + and - symbols
      const plusCount = (line.match(/\+/g) || []).length;
      const minusCount = (line.match(/-/g) || []).length;

      fileStats.push({
        file,
        additions: plusCount,
        deletions: minusCount,
      });
    }
  }

  // Parse summary line
  const summaryLine = lines[lines.length - 1];
  const addMatch = summaryLine.match(/(\d+) insertion/);
  const delMatch = summaryLine.match(/(\d+) deletion/);
  const filesMatch = summaryLine.match(/(\d+) file/);

  const totalAdditions = addMatch ? parseInt(addMatch[1]) : 0;
  const totalDeletions = delMatch ? parseInt(delMatch[1]) : 0;
  const filesCount = filesMatch ? parseInt(filesMatch[1]) : fileStats.length;

  return {
    additions: totalAdditions,
    deletions: totalDeletions,
    files: filesCount,
    fileStats,
  };
}

/**
 * Get raw diff output
 */
export function getDiff(staged?: boolean, target?: string): string {
  const args = ['diff'];
  if (staged) {
    args.push('--cached');
  }
  if (target) {
    args.push(target);
  }

  return git(args, { throwOnError: false });
}

/**
 * Get list of conflicted files with conflict line numbers
 */
export function getConflicts(): ConflictFile[] {
  const status = getStatus();
  const conflicts: ConflictFile[] = [];

  for (const file of status.conflicts) {
    const conflictLines: number[] = [];

    try {
      const content = execSync(`cat "${file.path}"`, { encoding: 'utf-8' });
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('<<<<<<<') ||
            lines[i].startsWith('=======') ||
            lines[i].startsWith('>>>>>>>')) {
          conflictLines.push(i + 1);
        }
      }
    } catch {
      // File might not exist or be readable
    }

    conflicts.push({ path: file.path, conflictLines });
  }

  return conflicts;
}

/**
 * Stage files
 */
export function stageFiles(files: string[]): string[] {
  const staged: string[] = [];

  for (const file of files) {
    try {
      git(['add', file]);
      staged.push(file);
    } catch {
      // Skip files that can't be staged
    }
  }

  return staged;
}
