import { Command } from 'commander';
import * as path from 'path';
import { runTruffleHogScan, isTruffleHogInstalled, hasGitDirectory } from '../utils/ggshield';
import { reportScan } from '../utils/gateway';
import { output, formatScanResult, errorOutput, type ScanResult } from '../utils/output';

export const historyScan = new Command('history-scan')
  .description('Deep scan git history for secrets (uses TruffleHog)')
  .argument('[path]', 'Path to git repository (defaults to current directory)', '.')
  .option('--only-verified', 'Only show verified secrets')
  .option('--no-report', 'Skip reporting to gateway')
  .action(async (targetPath: string, options: { onlyVerified?: boolean; report: boolean }) => {
    try {
      if (!isTruffleHogInstalled()) {
        errorOutput('trufflehog not installed. Run: brew install trufflehog');
        return;
      }

      const resolvedPath = path.resolve(targetPath);

      if (!hasGitDirectory(resolvedPath)) {
        errorOutput(`Not a git repository: ${resolvedPath}`);
        return;
      }

      const result = await runTruffleHogScan(resolvedPath, options.onlyVerified);

      if (!result.success) {
        errorOutput(result.error || 'History scan failed');
        return;
      }

      const scanResult: ScanResult = {
        success: true,
        secretsFound: result.secretsFound,
        path: resolvedPath,
        scanType: 'history',
        details: result.findings,
      };

      // Report to gateway if enabled
      if (options.report) {
        const reportResp = await reportScan({
          repo_path: resolvedPath,
          secrets_found: result.secretsFound,
          scan_type: 'history',
          details: result.findings,
        });

        if (reportResp.ok && reportResp.data) {
          scanResult.reportId = reportResp.data.id;
          scanResult.alertSent = reportResp.data.alertNeeded;
        }
      }

      output(formatScanResult(scanResult));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
