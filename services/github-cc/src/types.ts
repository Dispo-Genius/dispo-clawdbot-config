// GitHub PR types
export type MergeableState = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
export type MergeStateStatus = 'CLEAN' | 'DIRTY' | 'BLOCKED' | 'UNSTABLE' | 'BEHIND' | 'UNKNOWN';

export interface PullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  base: string;
  head: string;
  reviewDecision: string | null;
  checksStatus: string | null;
  mergeable?: MergeableState;
  mergeStateStatus?: MergeStateStatus;
  createdAt: string;
  updatedAt: string;
  url: string;
  body?: string;
  labels?: string[];
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface PullRequestList {
  number: number;
  title: string;
  author: string;
  reviewDecision: string | null;
  checksStatus: string | null;
  mergeable?: MergeableState;
  mergeStateStatus?: MergeStateStatus;
  updatedAt: string;
  labels?: string[];
}

// GitHub Issue types
export interface Issue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  assignees: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
  body?: string;
}

export interface IssueList {
  number: number;
  title: string;
  state: string;
  author: string;
  labels: string[];
  updatedAt: string;
}

// Check types
export interface Check {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  required: boolean;
}

export interface ChecksResult {
  prNumber: number;
  total: number;
  passing: number;
  failing: number;
  pending: number;
  checks: Check[];
}

// Comment types
export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  url?: string;
}

// Review types
export type ReviewAction = 'approve' | 'comment' | 'request-changes';

// Merge types
export type MergeMethod = 'squash' | 'merge' | 'rebase';

// Cache structure
export interface GitHubCache {
  lastSynced: string;
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
  };
}

// Output format
export type OutputFormat = 'compact' | 'table' | 'json';

// Git status types
export type FileStatus = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?' | '!';

export interface StatusFile {
  status: FileStatus;
  path: string;
  staged: boolean;
}

export interface GitStatus {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  modified: StatusFile[];
  staged: StatusFile[];
  untracked: StatusFile[];
  conflicts: StatusFile[];
  isRebase: boolean;
  rebaseStep?: number;
  rebaseTotal?: number;
  isClean: boolean;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  files: number;
  fileStats: Array<{
    file: string;
    additions: number;
    deletions: number;
  }>;
}

export interface ConflictFile {
  path: string;
  conflictLines: number[];
}

export interface RebaseResult {
  success: boolean;
  step?: number;
  total?: number;
  conflicts?: string[];
  message?: string;
}
