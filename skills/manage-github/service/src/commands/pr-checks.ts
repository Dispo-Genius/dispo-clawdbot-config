import { Command } from 'commander';
import { gh } from '../api/client';
import { output, formatChecks, errorOutput } from '../utils/output';
import type { ChecksResult, Check } from '../types';

interface GhCheck {
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string;
}

interface GhChecksResponse {
  statusCheckRollup: GhCheck[];
}

export const prChecks = new Command('pr-checks')
  .description('View PR check status')
  .argument('<number>', 'PR number')
  .option('--required', 'Show only required checks')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: { required?: boolean; repo?: string }) => {
    try {
      const result = gh<GhChecksResponse>(`pr view ${number}`, {
        repo: options.repo,
        json: ['statusCheckRollup'],
      });

      const rawChecks = result.statusCheckRollup || [];

      const checks: Check[] = rawChecks
        .filter((c) => c && c.name && c.status)
        .map((c) => ({
          name: c.name,
          status: c.status.toLowerCase() as Check['status'],
          conclusion: c.conclusion?.toLowerCase() || null,
          required: false, // gh CLI doesn't expose this directly
        }));

      // Filter to required only if requested
      const filteredChecks = options.required
        ? checks.filter((c) => c.required)
        : checks;

      const passing = filteredChecks.filter((c) => c.conclusion === 'success').length;
      const failing = filteredChecks.filter((c) => c.conclusion === 'failure' || c.conclusion === 'error').length;
      const pending = filteredChecks.filter((c) => !c.conclusion || c.status !== 'completed').length;

      const checksResult: ChecksResult = {
        prNumber: parseInt(number, 10),
        total: filteredChecks.length,
        passing,
        failing,
        pending,
        checks: filteredChecks,
      };

      output(formatChecks(checksResult));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
