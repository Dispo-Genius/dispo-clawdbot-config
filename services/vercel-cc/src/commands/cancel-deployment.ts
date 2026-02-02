import { Command } from 'commander';
import { cancelDeployment, formatDeploymentState } from '../api/client.js';
import { output, formatMutationResult, errorOutput } from '../utils/output.js';

export const cancelDeploymentCommand = new Command('cancel-deployment')
  .description('Cancel an in-progress or queued deployment')
  .argument('<deployment>', 'Deployment ID to cancel')
  .action(async (deploymentId) => {
    try {
      const deployment = await cancelDeployment(deploymentId);

      output(formatMutationResult('Canceled', {
        id: deployment.uid,
        state: formatDeploymentState(deployment.state || deployment.readyState),
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
