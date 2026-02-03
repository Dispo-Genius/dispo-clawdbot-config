import { Command } from 'commander';
import { ghRaw, getCurrentRepo } from '../api/client';
import { output, errorOutput, getFormat } from '../utils/output';

interface Deployment {
  id: number;
  environment: string;
  state: string;
  url: string | null;
  created_at: string;
}

interface DeploymentStatus {
  state: string;
  environment_url: string | null;
  log_url: string | null;
  created_at: string;
}

interface DeploymentsResult {
  prNumber: number;
  deployments: Array<{
    environment: string;
    state: string;
    previewUrl: string | null;
    logUrl: string | null;
    createdAt: string;
  }>;
}

export const prDeployments = new Command('pr-deployments')
  .description('Get deployment URLs for a PR (e.g., Vercel preview links)')
  .argument('<number>', 'PR number')
  .option('--env <environment>', 'Filter by environment (e.g., Preview, Production)')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (number: string, options: { env?: string; repo?: string }) => {
    try {
      const repo = options.repo ? parseRepo(options.repo) : getCurrentRepo();
      if (!repo) {
        return errorOutput('Could not determine repository');
      }

      // Get PR head SHA
      const prData = ghRaw('api', [
        `repos/${repo.owner}/${repo.name}/pulls/${number}`,
        '--jq', '.head.sha'
      ]);
      const headSha = prData.trim();

      if (!headSha) {
        return errorOutput('Could not get PR head SHA');
      }

      // Get deployments for this SHA (use query params in URL, not -f)
      const deploymentsRaw = ghRaw('api', [
        `repos/${repo.owner}/${repo.name}/deployments?sha=${headSha}&per_page=20`
      ]);

      const deployments: Deployment[] = JSON.parse(deploymentsRaw);

      if (deployments.length === 0) {
        return output(formatDeploymentsResult({ prNumber: parseInt(number), deployments: [] }));
      }

      // Filter by environment if specified
      const filteredDeployments = options.env
        ? deployments.filter(d => d.environment.toLowerCase().includes(options.env!.toLowerCase()))
        : deployments;

      // Get deployment statuses for each deployment
      const results: DeploymentsResult['deployments'] = [];

      for (const deployment of filteredDeployments) {
        try {
          const statusesRaw = ghRaw('api', [
            `repos/${repo.owner}/${repo.name}/deployments/${deployment.id}/statuses?per_page=1`
          ]);

          const statuses: DeploymentStatus[] = JSON.parse(statusesRaw);
          const latestStatus = statuses[0];

          results.push({
            environment: deployment.environment,
            state: latestStatus?.state || 'pending',
            previewUrl: latestStatus?.environment_url || null,
            logUrl: latestStatus?.log_url || null,
            createdAt: deployment.created_at,
          });
        } catch {
          results.push({
            environment: deployment.environment,
            state: 'unknown',
            previewUrl: null,
            logUrl: null,
            createdAt: deployment.created_at,
          });
        }
      }

      output(formatDeploymentsResult({ prNumber: parseInt(number), deployments: results }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });

function parseRepo(repo: string): { owner: string; name: string } | null {
  const parts = repo.split('/');
  if (parts.length !== 2) return null;
  return { owner: parts[0], name: parts[1] };
}

function formatDeploymentsResult(result: DeploymentsResult): string {
  const format = getFormat();

  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (result.deployments.length === 0) {
    return `deployments[0]{}:#${result.prNumber}`;
  }

  // Find Vercel preview URL (most common use case)
  const preview = result.deployments.find(d =>
    d.environment.toLowerCase().includes('preview') && d.previewUrl
  );

  if (format === 'table') {
    const header = `Deployments for PR #${result.prNumber}:`;
    const rows = result.deployments.map(d =>
      `  ${d.environment}: ${d.state} ${d.previewUrl || '(no url)'}`
    );
    return [header, ...rows].join('\n');
  }

  // Compact format - prioritize preview URL
  if (preview?.previewUrl) {
    return `deployments:#${result.prNumber}|preview:${preview.previewUrl}`;
  }

  // Fallback: list all
  const header = `deployments[${result.deployments.length}]{env|state|url}:#${result.prNumber}`;
  const rows = result.deployments.map(d =>
    `${d.environment}|${d.state}|${d.previewUrl || '-'}`
  );
  return [header, ...rows].join('\n');
}
