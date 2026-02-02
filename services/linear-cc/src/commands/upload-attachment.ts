import { Command } from 'commander';
import { existsSync } from 'fs';
import { basename } from 'path';
import { errorOutput } from '../utils/output';

/**
 * Upload an attachment to a Linear issue.
 *
 * TODO: Linear's GraphQL API doesn't have a direct file upload mutation.
 * Attachments need to be uploaded via the Linear SDK's uploadFile method
 * or by using Linear's REST-based upload endpoint.
 *
 * For now, this is a stub that returns a warning. Once the upload
 * endpoint is available or we integrate the Linear SDK, implement:
 * 1. Get upload URL from Linear API
 * 2. Upload file to that URL
 * 3. Create attachment record linking to the issue
 */
export const uploadAttachment = new Command('upload-attachment')
  .description('Upload a file attachment to a Linear issue (stub - upload not yet implemented)')
  .requiredOption('--issue <id>', 'Issue identifier (PRO-123)')
  .requiredOption('--file <path>', 'Path to file to upload')
  .option('--title <title>', 'Title for the attachment')
  .action(async (options: {
    issue: string;
    file: string;
    title?: string;
  }) => {
    try {
      // Validate file exists
      if (!existsSync(options.file)) {
        errorOutput(`File not found: ${options.file}`);
      }

      const filename = basename(options.file);

      // TODO: Implement actual upload once endpoint is available
      errorOutput(`Upload not yet implemented. File: ${filename}, Issue: ${options.issue}. Use Linear UI for now.`);
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
