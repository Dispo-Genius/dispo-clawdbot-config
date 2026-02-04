import { Command } from 'commander';
import * as path from 'path';
import { runGGShieldScan, isGGShieldInstalled } from '../utils/ggshield';
import { reportScan, getConfig } from '../utils/gateway';
import { output, formatScanResult, errorOutput, type ScanResult } from '../utils/output';

export const scan = new Command('scan')
  .description('Scan for secrets in a directory')
  .argument('[path]', 'Path to scan (defaults to current directory)', '.')
  .option('--all', 'Scan all registered repos')
  .option('--no-report', 'Skip reporting to gateway')
  .action(async (targetPath: string, options: { all?: boolean; report: boolean }) => {
    try {
      if (!isGGShieldInstalled()) {
        errorOutput('ggshield not installed. Run: brew install gitguardian/tap/ggshield');
        return;
      }

      const pathsToScan: string[] = [];

      if (options.all) {
        // Get registered repos from gateway config
        const configResp = await getConfig();
        if (!configResp.ok || !configResp.data) {
          errorOutput(`Failed to get config from gateway: ${configResp.error || 'Unknown error'}`);
          return;
        }

        const repos = configResp.data.repos || [];
        if (repos.length === 0) {
          errorOutput('No repos registered. Use "config add-repo <path>" to register repos.');
          return;
        }

        pathsToScan.push(...repos);
      } else {
        // Resolve the target path
        const resolvedPath = path.resolve(targetPath);
        pathsToScan.push(resolvedPath);
      }

      // Scan each path
      for (const scanPath of pathsToScan) {
        const result = await runGGShieldScan(scanPath);

        if (!result.success) {
          errorOutput(result.error || 'Scan failed');
          continue;
        }

        const scanResult: ScanResult = {
          success: true,
          secretsFound: result.secretsFound,
          path: scanPath,
          scanType: 'manual',
          details: result.details,
        };

        // Report to gateway if enabled
        if (options.report) {
          const reportResp = await reportScan({
            repo_path: scanPath,
            secrets_found: result.secretsFound,
            scan_type: 'manual',
            details: result.details,
          });

          if (reportResp.ok && reportResp.data) {
            scanResult.reportId = reportResp.data.id;
            scanResult.alertSent = reportResp.data.alertNeeded;
          }
        }

        output(formatScanResult(scanResult));
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
