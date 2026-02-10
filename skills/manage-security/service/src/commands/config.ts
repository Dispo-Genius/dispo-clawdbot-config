import { Command } from 'commander';
import * as path from 'path';
import { getConfig, updateConfig } from '../utils/gateway';
import { output, formatConfigResult, errorOutput, successOutput } from '../utils/output';

export const config = new Command('config')
  .description('Manage security configuration')
  .argument('<action>', 'Action: get, add-repo, remove-repo, set-slack')
  .argument('[value]', 'Value for action (repo path or on/off)')
  .action(async (action: string, value?: string) => {
    try {
      switch (action) {
        case 'get': {
          const resp = await getConfig();
          if (!resp.ok || !resp.data) {
            errorOutput(`Failed to get config: ${resp.error || 'Unknown error'}`);
            return;
          }

          // Convert gateway response to ConfigResult type
          output(formatConfigResult({
            clientId: resp.data.client_id,
            repos: resp.data.repos,
            cronEnabled: resp.data.cron_enabled,
            slackNotify: resp.data.slack_notify,
          }));
          break;
        }

        case 'add-repo': {
          if (!value) {
            errorOutput('Missing repo path. Usage: config add-repo <path>');
            return;
          }

          const resolvedPath = path.resolve(value);

          // Get current config
          const configResp = await getConfig();
          if (!configResp.ok || !configResp.data) {
            errorOutput(`Failed to get config: ${configResp.error || 'Unknown error'}`);
            return;
          }

          const currentRepos = configResp.data.repos || [];
          if (currentRepos.includes(resolvedPath)) {
            successOutput('Repo already registered', { path: resolvedPath });
            return;
          }

          // Add the new repo
          const newRepos = [...currentRepos, resolvedPath];
          const updateResp = await updateConfig({ repos: newRepos });

          if (!updateResp.ok) {
            errorOutput(`Failed to update config: ${updateResp.error}`);
            return;
          }

          successOutput('Repo registered', { path: resolvedPath, totalRepos: newRepos.length });
          break;
        }

        case 'remove-repo': {
          if (!value) {
            errorOutput('Missing repo path. Usage: config remove-repo <path>');
            return;
          }

          const resolvedPath = path.resolve(value);

          // Get current config
          const configResp = await getConfig();
          if (!configResp.ok || !configResp.data) {
            errorOutput(`Failed to get config: ${configResp.error || 'Unknown error'}`);
            return;
          }

          const currentRepos = configResp.data.repos || [];
          const newRepos = currentRepos.filter((r) => r !== resolvedPath);

          if (newRepos.length === currentRepos.length) {
            errorOutput(`Repo not found: ${resolvedPath}`);
            return;
          }

          // Update config
          const updateResp = await updateConfig({ repos: newRepos });

          if (!updateResp.ok) {
            errorOutput(`Failed to update config: ${updateResp.error}`);
            return;
          }

          successOutput('Repo removed', { path: resolvedPath, remainingRepos: newRepos.length });
          break;
        }

        case 'set-slack': {
          if (!value || !['on', 'off'].includes(value.toLowerCase())) {
            errorOutput('Missing or invalid value. Usage: config set-slack <on|off>');
            return;
          }

          const slackNotify = value.toLowerCase() === 'on';
          const updateResp = await updateConfig({ slack_notify: slackNotify });

          if (!updateResp.ok) {
            errorOutput(`Failed to update config: ${updateResp.error}`);
            return;
          }

          successOutput(`Slack notifications ${slackNotify ? 'enabled' : 'disabled'}`);
          break;
        }

        default:
          errorOutput(`Unknown action: ${action}. Use get, add-repo, remove-repo, or set-slack.`);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
