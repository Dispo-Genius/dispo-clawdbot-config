import { Command } from 'commander';
import { gh } from '../api/client';
import { output, formatPRList, errorOutput } from '../utils/output';
import type { PullRequestList, MergeableState, MergeStateStatus } from '../types';

interface GhPRListItem {
  number: number;
  title: string;
  author: { login: string };
  reviewDecision: string | null;
  statusCheckRollup: Array<{ conclusion: string; state: string }> | null;
  mergeable: string;
  mergeStateStatus: string;
  updatedAt: string;
  labels: Array<{ name: string }>;
}

export const prList = new Command('pr-list')
  .description('List pull requests')
  .option('--state <state>', 'Filter by state: open, closed, merged, all', 'open')
  .option('--author <author>', 'Filter by author')
  .option('--label <label>', 'Filter by label')
  .option('--limit <limit>', 'Max PRs to return', '20')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (options: {
    state?: string;
    author?: string;
    label?: string;
    limit?: string;
    repo?: string;
  }) => {
    try {
      const args: string[] = [];

      if (options.state) {
        args.push('--state', options.state);
      }
      if (options.author) {
        args.push('--author', options.author);
      }
      if (options.label) {
        args.push('--label', options.label);
      }

      const result = gh<GhPRListItem[]>('pr list', {
        repo: options.repo,
        json: ['number', 'title', 'author', 'reviewDecision', 'statusCheckRollup', 'mergeable', 'mergeStateStatus', 'updatedAt', 'labels'],
        limit: parseInt(options.limit || '20', 10),
        args,
      });

      const prs: PullRequestList[] = result.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.author.login,
        reviewDecision: pr.reviewDecision,
        checksStatus: getChecksStatus(pr.statusCheckRollup),
        mergeable: pr.mergeable as MergeableState,
        mergeStateStatus: pr.mergeStateStatus as MergeStateStatus,
        updatedAt: pr.updatedAt,
        labels: pr.labels.map((l) => l.name),
      }));

      output(formatPRList(prs));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

function getChecksStatus(checks: Array<{ conclusion: string; state: string }> | null): string | null {
  if (!checks || checks.length === 0) return null;

  const hasFailure = checks.some((c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR');
  const hasPending = checks.some((c) => c.state === 'PENDING' || c.state === 'IN_PROGRESS');
  const allSuccess = checks.every((c) => c.conclusion === 'SUCCESS');

  if (hasFailure) return 'FAILURE';
  if (hasPending) return 'PENDING';
  if (allSuccess) return 'SUCCESS';
  return null;
}
