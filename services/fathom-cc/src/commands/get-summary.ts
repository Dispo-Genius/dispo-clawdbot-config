import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, errorOutput } from '../utils/output';

export const getSummary = new Command('get-summary')
  .description('Get AI-generated meeting summary by recording ID')
  .argument('<recordingId>', 'The recording ID')
  .action(async (recordingId) => {
    try {
      const id = parseInt(recordingId, 10);
      if (isNaN(id)) {
        errorOutput('Invalid recording ID. Must be a number.');
      }

      const response = await fathomClient.getRecordingSummary({
        recordingId: id,
      });

      // Response is a union type - check if it has 'summary' property (sync response)
      if (!response || !('summary' in response)) {
        errorOutput('Summary not found or async callback was triggered.');
      }

      const summary = (response as any).summary;

      if (!summary) {
        errorOutput('Summary not available for this meeting.');
      }

      output({
        templateName: summary.templateName,
        summary: summary.markdownFormatted,
      });
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
