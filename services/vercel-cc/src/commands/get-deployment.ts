import { Command } from 'commander';
import {
  getDeployment,
  formatDeploymentState,
  formatTimestamp,
} from '../api/client.js';
import { output, formatDeployment, errorOutput } from '../utils/output.js';

export const getDeploymentCommand = new Command('get-deployment')
  .description('Get details of a specific deployment')
  .argument('<deployment>', 'Deployment ID or URL')
  .action(async (deploymentArg) => {
    try {
      const deployment = await getDeployment(deploymentArg);

      output(formatDeployment({
        id: deployment.uid,
        name: deployment.name,
        url: deployment.url,
        state: formatDeploymentState(deployment.state || deployment.readyState),
        target: deployment.target || 'preview',
        created: formatTimestamp(deployment.created || deployment.createdAt),
        inspectorUrl: deployment.inspectorUrl,
        projectId: deployment.projectId,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : String(error));
    }
  });
