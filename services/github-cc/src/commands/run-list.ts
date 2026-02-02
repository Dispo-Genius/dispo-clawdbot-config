import { Command } from 'commander';
import { gh } from '../api/client';
import { output, errorOutput } from '../utils/output';

interface GhRunItem {
  databaseId: number;
  displayTitle: string;
  status: string;
  conclusion: string | null;
  workflowName: string;
  event: string;
  createdAt: string;
  headBranch: string;
}

export const runList = new Command('run-list')
  .description('List workflow runs')
  .option('--limit <n>', 'Max runs to return', '20')
  .option('--status <status>', 'Filter by status: queued, in_progress, completed, failure, success')
  .option('--workflow <name>', 'Filter by workflow name')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action((options: {
    limit?: string;
    status?: string;
    workflow?: string;
    repo?: string;
  }) => {
    try {
      const args: string[] = [];

      if (options.status) {
        args.push('--status', options.status);
      }
      if (options.workflow) {
        args.push('--workflow', options.workflow);
      }

      const result = gh<GhRunItem[]>('run list', {
        repo: options.repo,
        json: ['databaseId', 'displayTitle', 'status', 'conclusion', 'workflowName', 'event', 'createdAt', 'headBranch'],
        limit: parseInt(options.limit || '20', 10),
        args,
      });

      if (result.length === 0) {
        output('runs[0]{}:');
        return;
      }

      const header = `runs[${result.length}]{id|title|status|conclusion|workflow|branch|date}:`;
      const rows = result.map((r) => {
        const title = r.displayTitle.length > 40 ? r.displayTitle.slice(0, 37) + '...' : r.displayTitle;
        const date = r.createdAt.split('T')[0];
        return `${r.databaseId}|${title}|${r.status}|${r.conclusion || '-'}|${r.workflowName}|${r.headBranch}|${date}`;
      });

      output([header, ...rows].join('\n'));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
