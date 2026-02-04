import { Command } from 'commander';
import { gh } from '../api/client';
import { output, formatPR, formatComments, errorOutput } from '../utils/output';
import type { PullRequest, Comment, MergeableState, MergeStateStatus } from '../types';

interface GhPRView {
  number: number;
  title: string;
  state: string;
  author: { login: string };
  baseRefName: string;
  headRefName: string;
  reviewDecision: string | null;
  statusCheckRollup: Array<{ conclusion: string; state: string }> | null;
  mergeable: string;
  mergeStateStatus: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  body: string;
  labels: Array<{ name: string }>;
  additions: number;
  deletions: number;
  changedFiles: number;
}

interface GhComment {
  id: string;
  author: { login: string };
  body: string;
  createdAt: string;
  url: string;
}

export const prView = new Command('pr-view')
  .description('View a pull request')
  .argument('<number>', 'PR number')
  .option('--comments', 'Include comments')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: { comments?: boolean; repo?: string }) => {
    try {
      const result = gh<GhPRView>(`pr view ${number}`, {
        repo: options.repo,
        json: [
          'number', 'title', 'state', 'author', 'baseRefName', 'headRefName',
          'reviewDecision', 'statusCheckRollup', 'mergeable', 'mergeStateStatus',
          'createdAt', 'updatedAt', 'url', 'body', 'labels', 'additions',
          'deletions', 'changedFiles'
        ],
      });

      const pr: PullRequest = {
        number: result.number,
        title: result.title,
        state: result.state.toLowerCase() as 'open' | 'closed' | 'merged',
        author: result.author.login,
        base: result.baseRefName,
        head: result.headRefName,
        reviewDecision: result.reviewDecision,
        checksStatus: getChecksStatus(result.statusCheckRollup),
        mergeable: result.mergeable as MergeableState,
        mergeStateStatus: result.mergeStateStatus as MergeStateStatus,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        url: result.url,
        body: result.body,
        labels: result.labels.map((l) => l.name),
        additions: result.additions,
        deletions: result.deletions,
        changedFiles: result.changedFiles,
      };

      output(formatPR(pr));

      if (options.comments) {
        const commentsResult = gh<GhComment[]>(`pr view ${number}`, {
          repo: options.repo,
          json: ['comments'],
          args: ['--comments'],
        });

        // The API returns comments nested
        const rawComments = (commentsResult as unknown as { comments: GhComment[] }).comments || [];
        const comments: Comment[] = rawComments.map((c) => ({
          id: c.id,
          author: c.author?.login || 'unknown',
          body: c.body,
          createdAt: c.createdAt,
          url: c.url,
        }));

        if (comments.length > 0) {
          output('\n' + formatComments('pr', pr.number, comments));
        }
      }
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
