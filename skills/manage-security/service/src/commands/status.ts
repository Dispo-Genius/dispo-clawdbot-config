import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig, getScanHistory } from '../utils/gateway';
import { getPreCommitHookPath, isGGShieldInstalled, isTruffleHogInstalled } from '../utils/ggshield';
import { output, formatStatusResult, errorOutput, type StatusResult } from '../utils/output';

function checkHookInstalled(repoPath: string): boolean {
  const hookPath = getPreCommitHookPath(repoPath);
  if (!fs.existsSync(hookPath)) {
    return false;
  }

  const content = fs.readFileSync(hookPath, 'utf-8');
  return content.includes('manage-security skill') || content.includes('ggshield');
}

export const status = new Command('status')
  .description('Show security posture')
  .option('--history <n>', 'Number of recent scans to show', '5')
  .action(async (options: { history: string }) => {
    try {
      const historyLimit = parseInt(options.history, 10) || 5;

      // Get config from gateway
      const configResp = await getConfig();
      if (!configResp.ok || !configResp.data) {
        errorOutput(`Failed to get config: ${configResp.error || 'Unknown error'}`);
        return;
      }

      const config = configResp.data;
      const repos = config.repos || [];

      // Check which repos have hooks installed
      const hooksInstalled: string[] = [];
      for (const repoPath of repos) {
        if (fs.existsSync(repoPath) && checkHookInstalled(repoPath)) {
          hooksInstalled.push(repoPath);
        }
      }

      // Get scan history
      const historyResp = await getScanHistory(historyLimit);
      const recentScans = historyResp.ok && historyResp.data?.scans
        ? historyResp.data.scans.map((s) => ({
            path: s.repo_path,
            secretsFound: s.secrets_found,
            scanType: s.scan_type,
            createdAt: s.created_at,
          }))
        : [];

      const result: StatusResult = {
        hooksInstalled,
        registeredRepos: repos,
        cronEnabled: config.cron_enabled,
        slackNotify: config.slack_notify,
        recentScans,
      };

      // Add tool status
      const toolStatus = {
        ggshield: isGGShieldInstalled(),
        trufflehog: isTruffleHogInstalled(),
      };

      output({
        ...result,
        tools: toolStatus,
      });
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
