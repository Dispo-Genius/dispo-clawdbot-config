import { getDb } from '../db/migrate';
import { getUncommittedFiles } from './activity';
import { listSessions } from '../coordination/session-registry';
import { spawn } from 'child_process';

/**
 * Information about a GitHub PR that might conflict with session work.
 */
export interface PullRequestInfo {
  number: number;
  title: string;
  author: string;
  branch: string;
  files: string[];
  url: string;
  created_at: string;
}

/**
 * Overlap detection result.
 */
export interface PrOverlap {
  pr: PullRequestInfo;
  overlapping_files: string[];
  overlap_count: number;
}

// Cache for PR data (refreshed every 60 seconds)
let prCache: PullRequestInfo[] = [];
let lastPrFetch = 0;
const PR_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Run gh CLI command and return stdout.
 */
async function runGhCommand(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data;
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `gh command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Fetch open PRs from GitHub targeting main branch.
 */
export async function fetchOpenPRs(cwd?: string): Promise<PullRequestInfo[]> {
  const now = Date.now();

  // Return cached data if fresh
  if (now - lastPrFetch < PR_CACHE_TTL_MS && prCache.length > 0) {
    return prCache;
  }

  try {
    // Get open PRs in JSON format
    const prListJson = await runGhCommand(
      ['pr', 'list', '--state', 'open', '--base', 'main', '--json', 'number,title,author,headRefName,url,createdAt'],
      cwd
    );

    const prs = JSON.parse(prListJson) as {
      number: number;
      title: string;
      author: { login: string };
      headRefName: string;
      url: string;
      createdAt: string;
    }[];

    // Fetch files for each PR (limit to 10 PRs to avoid rate limits)
    const prInfos: PullRequestInfo[] = [];
    for (const pr of prs.slice(0, 10)) {
      try {
        const filesJson = await runGhCommand(
          ['pr', 'view', String(pr.number), '--json', 'files'],
          cwd
        );
        const { files } = JSON.parse(filesJson) as { files: { path: string }[] };

        prInfos.push({
          number: pr.number,
          title: pr.title,
          author: pr.author.login,
          branch: pr.headRefName,
          files: files.map((f) => f.path),
          url: pr.url,
          created_at: pr.createdAt,
        });
      } catch (err) {
        // Skip PR if files fetch fails
        console.warn(`[pr-watch] Failed to fetch files for PR #${pr.number}: ${err}`);
      }
    }

    prCache = prInfos;
    lastPrFetch = now;
    return prInfos;
  } catch (err) {
    console.error(`[pr-watch] Failed to fetch PRs: ${err instanceof Error ? err.message : String(err)}`);
    return prCache; // Return stale cache on error
  }
}

/**
 * Get overlapping PRs for a session's uncommitted files.
 */
export async function getOverlappingPRs(sessionId: string, cwd?: string): Promise<PrOverlap[]> {
  const uncommittedFiles = getUncommittedFiles(sessionId);
  if (uncommittedFiles.length === 0) {
    return [];
  }

  const prs = await fetchOpenPRs(cwd);
  const overlaps: PrOverlap[] = [];

  for (const pr of prs) {
    const overlappingFiles: string[] = [];

    for (const uncommitted of uncommittedFiles) {
      // Normalize: uncommitted is absolute path, PR files are relative
      const uncommittedRelative = uncommitted.split('/').slice(-3).join('/'); // Last 3 segments

      for (const prFile of pr.files) {
        // Check if paths overlap (end of uncommitted matches start or all of prFile)
        if (uncommitted.endsWith(prFile) || prFile.endsWith(uncommittedRelative.split('/').slice(-1)[0])) {
          overlappingFiles.push(prFile);
          break; // Only count once per uncommitted file
        }
      }
    }

    if (overlappingFiles.length > 0) {
      overlaps.push({
        pr,
        overlapping_files: [...new Set(overlappingFiles)], // Dedupe
        overlap_count: overlappingFiles.length,
      });
    }
  }

  return overlaps;
}

/**
 * Get PR watch status for a session.
 * Returns overlapping PRs and sync recommendation.
 */
export async function getPRWatchStatus(
  sessionId: string,
  cwd?: string
): Promise<{
  overlapping_prs: PrOverlap[];
  should_sync: boolean;
  sync_reason?: string;
}> {
  const overlaps = await getOverlappingPRs(sessionId, cwd);

  if (overlaps.length === 0) {
    return { overlapping_prs: [], should_sync: false };
  }

  // Calculate sync urgency
  const totalOverlap = overlaps.reduce((sum, o) => sum + o.overlap_count, 0);
  const shouldSync = totalOverlap >= 2; // Sync if 2+ files overlap with any PRs

  return {
    overlapping_prs: overlaps,
    should_sync: shouldSync,
    sync_reason: shouldSync
      ? `${totalOverlap} uncommitted file(s) overlap with ${overlaps.length} open PR(s)`
      : undefined,
  };
}

/**
 * Clear PR cache (for testing or forced refresh).
 */
export function clearPRCache(): void {
  prCache = [];
  lastPrFetch = 0;
}

/**
 * Get all sessions that have overlapping work with open PRs.
 * Used for proactive warnings.
 */
export async function getAllSessionOverlaps(cwd?: string): Promise<Map<string, PrOverlap[]>> {
  const sessions = listSessions({ status: 'active' });
  const result = new Map<string, PrOverlap[]>();

  for (const session of sessions) {
    const overlaps = await getOverlappingPRs(session.id, cwd);
    if (overlaps.length > 0) {
      result.set(session.id, overlaps);
    }
  }

  return result;
}
