import { Command } from 'commander';
import { gh, checkAuth, getCurrentRepo } from '../api/client';
import { saveCache, getCacheFilePath } from '../config/cache';
import { output, formatMutationResult, errorOutput } from '../utils/output';
import type { GitHubCache } from '../types';

interface GhRepoView {
  owner: { login: string };
  name: string;
  defaultBranchRef: { name: string };
}

export const sync = new Command('sync')
  .description('Sync repository metadata and verify authentication')
  .option('--repo <repo>', 'Repository in owner/repo format')
  .action(async (options: { repo?: string }) => {
    try {
      // Check auth
      if (!checkAuth()) {
        errorOutput('Not authenticated. Run `gh auth login` first');
      }

      // Get repo info
      let repoInfo: { owner: string; name: string; defaultBranch: string };

      if (options.repo) {
        const [owner, name] = options.repo.split('/');
        if (!owner || !name) {
          errorOutput('Invalid repo format. Use owner/repo');
        }

        const result = gh<GhRepoView>('repo view', {
          repo: options.repo,
          json: ['owner', 'name', 'defaultBranchRef'],
        });

        repoInfo = {
          owner: result.owner.login,
          name: result.name,
          defaultBranch: result.defaultBranchRef.name,
        };
      } else {
        const current = getCurrentRepo();
        if (!current) {
          errorOutput('Not in a git repository. Use --repo to specify one');
        }

        const result = gh<GhRepoView>('repo view', {
          json: ['owner', 'name', 'defaultBranchRef'],
        });

        repoInfo = {
          owner: result.owner.login,
          name: result.name,
          defaultBranch: result.defaultBranchRef.name,
        };
      }

      // Save cache
      const cache: GitHubCache = {
        lastSynced: new Date().toISOString(),
        repo: repoInfo,
      };

      saveCache(cache);

      output(formatMutationResult('Synced', {
        repo: `${repoInfo.owner}/${repoInfo.name}`,
        defaultBranch: repoInfo.defaultBranch,
        cacheFile: getCacheFilePath(),
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
