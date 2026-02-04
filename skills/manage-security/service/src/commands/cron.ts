import { Command } from 'commander';
import { spawnSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { updateConfig, getConfig, reportScan } from '../utils/gateway';
import { runGGShieldScan, isGGShieldInstalled } from '../utils/ggshield';
import { errorOutput, successOutput, output, formatScanResult, type ScanResult } from '../utils/output';

const CRON_SCRIPT_PATH = path.join(os.homedir(), '.claude', 'scripts', 'security-scan-cron.sh');
const CRON_JOB_COMMENT = '# manage-security weekly scan';

function getCrontab(): string {
  const result = spawnSync('crontab', ['-l'], { encoding: 'utf-8' });
  if (result.status !== 0) {
    return '';
  }
  return result.stdout || '';
}

function setCrontab(content: string): boolean {
  const result = spawnSync('crontab', ['-'], {
    input: content,
    encoding: 'utf-8',
  });
  return result.status === 0;
}

function hasCronJob(): boolean {
  const crontab = getCrontab();
  return crontab.includes(CRON_JOB_COMMENT);
}

function addCronJob(): boolean {
  const crontab = getCrontab();
  if (crontab.includes(CRON_JOB_COMMENT)) {
    return true; // Already exists
  }

  // Weekly Sunday 2am
  const newLine = `${CRON_JOB_COMMENT}\n0 2 * * 0 ${CRON_SCRIPT_PATH}\n`;
  const newCrontab = crontab + newLine;
  return setCrontab(newCrontab);
}

function removeCronJob(): boolean {
  const crontab = getCrontab();
  if (!crontab.includes(CRON_JOB_COMMENT)) {
    return true; // Already removed
  }

  // Remove our lines
  const lines = crontab.split('\n');
  const filtered = lines.filter((line) => {
    if (line.includes(CRON_JOB_COMMENT)) return false;
    if (line.includes(CRON_SCRIPT_PATH)) return false;
    return true;
  });

  return setCrontab(filtered.join('\n'));
}

function createCronScript(): void {
  const fs = require('fs');
  const scriptsDir = path.dirname(CRON_SCRIPT_PATH);

  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  const script = `#!/bin/bash
# Security scan cron job - installed by manage-security skill
# Runs weekly to scan registered repos

GATEWAY_CLI="npx tsx ~/.claude/skills/manage-security/service/src/index.ts"

# Run cron scan
$GATEWAY_CLI cron run
`;

  fs.writeFileSync(CRON_SCRIPT_PATH, script, { mode: 0o755 });
}

export const cron = new Command('cron')
  .description('Manage scheduled weekly security scans')
  .argument('<action>', 'Action: enable, disable, run')
  .action(async (action: string) => {
    try {
      switch (action) {
        case 'enable': {
          // Update gateway config
          const configResp = await updateConfig({ cron_enabled: true });
          if (!configResp.ok) {
            errorOutput(`Failed to update gateway config: ${configResp.error}`);
            return;
          }

          // Create cron script
          createCronScript();

          // Add cron job
          if (!addCronJob()) {
            errorOutput('Failed to add cron job');
            return;
          }

          successOutput('Weekly cron scan enabled', {
            schedule: 'Sundays at 2:00 AM',
            script: CRON_SCRIPT_PATH,
          });
          break;
        }

        case 'disable': {
          // Update gateway config
          const configResp = await updateConfig({ cron_enabled: false });
          if (!configResp.ok) {
            errorOutput(`Failed to update gateway config: ${configResp.error}`);
            return;
          }

          // Remove cron job
          if (!removeCronJob()) {
            errorOutput('Failed to remove cron job');
            return;
          }

          successOutput('Weekly cron scan disabled');
          break;
        }

        case 'run': {
          // Run scan on all registered repos
          if (!isGGShieldInstalled()) {
            errorOutput('ggshield not installed. Run: brew install gitguardian/tap/ggshield');
            return;
          }

          const configResp = await getConfig();
          if (!configResp.ok || !configResp.data) {
            errorOutput(`Failed to get config: ${configResp.error}`);
            return;
          }

          const repos = configResp.data.repos || [];
          if (repos.length === 0) {
            errorOutput('No repos registered. Use "config add-repo <path>" to register repos.');
            return;
          }

          let totalSecrets = 0;
          const results: ScanResult[] = [];

          for (const repoPath of repos) {
            const scanResult = await runGGShieldScan(repoPath);

            if (scanResult.success) {
              totalSecrets += scanResult.secretsFound;

              const result: ScanResult = {
                success: true,
                secretsFound: scanResult.secretsFound,
                path: repoPath,
                scanType: 'cron',
                details: scanResult.details,
              };

              // Report to gateway
              const reportResp = await reportScan({
                repo_path: repoPath,
                secrets_found: scanResult.secretsFound,
                scan_type: 'cron',
                details: scanResult.details,
              });

              if (reportResp.ok && reportResp.data) {
                result.reportId = reportResp.data.id;
                result.alertSent = reportResp.data.alertNeeded;
              }

              results.push(result);
            }
          }

          // Output results
          for (const result of results) {
            output(formatScanResult(result));
          }

          if (totalSecrets > 0) {
            console.error(`\nWARNING: ${totalSecrets} secrets found across ${repos.length} repos`);
          }
          break;
        }

        default:
          errorOutput(`Unknown action: ${action}. Use enable, disable, or run.`);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
