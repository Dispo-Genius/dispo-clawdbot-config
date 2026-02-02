import { Command } from 'commander';
import { linearClient } from '../api/client';
import { loadCache } from '../config/cache';
import { output, formatMutationResult, errorOutput } from '../utils/output';

export const updateStatus = new Command('update-status')
  .description('Update the status of a Linear issue')
  .argument('<id>', 'Issue identifier (DIS-47) or UUID')
  .argument('<status>', 'New status (backlog, todo, in-progress, in-review, done, canceled)')
  .action(async (id: string, status: string) => {
    try {
      const cache = loadCache();
      if (!cache) {
        errorOutput('Cache not found. Run `sync` first.');
      }

      // Normalize status name
      const statusKey = status.toLowerCase().replace(/ /g, '-');
      const stateId = cache.states[statusKey];

      if (!stateId) {
        errorOutput(`Status "${status}" not found. Available: ${Object.keys(cache.states).join(', ')}`);
      }

      const mutation = `
        mutation UpdateIssue($id: String!, $stateId: String!) {
          issueUpdate(id: $id, input: { stateId: $stateId }) {
            success
            issue {
              id
              identifier
              state {
                name
              }
            }
          }
        }
      `;

      const result = await linearClient.request<{
        issueUpdate: {
          success: boolean;
          issue: { id: string; identifier: string; state: { name: string } };
        };
      }>(mutation, { id, stateId });

      if (result.issueUpdate.success) {
        output(formatMutationResult('Updated', {
          identifier: result.issueUpdate.issue.identifier,
          id: result.issueUpdate.issue.id,
          state: result.issueUpdate.issue.state.name,
        }));
      } else {
        errorOutput('Status update failed');
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
