import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, formatActionItems, errorOutput } from '../utils/output';

export const getActionItems = new Command('get-action-items')
  .description('Get action items from a meeting')
  .argument('<recordingId>', 'The recording ID')
  .option('--show-completed', 'Include completed items', true)
  .option('--only-pending', 'Show only pending items')
  .action(async (recordingId, options) => {
    try {
      const id = parseInt(recordingId, 10);
      if (isNaN(id)) {
        errorOutput('Invalid recording ID. Must be a number.');
      }

      // Fetch meeting with action items
      const iterator = await fathomClient.listMeetings({
        includeActionItems: true,
      });

      for await (const page of iterator) {
        if (!page?.result?.items) continue;

        const meeting = page.result.items.find((m: any) => m.recordingId === id);
        if (meeting) {
          if (!meeting.actionItems || meeting.actionItems.length === 0) {
            output('No action items found for this meeting.');
            return;
          }

          let items = meeting.actionItems;

          if (options.onlyPending) {
            items = items.filter((a: any) => !a.completed);
          }

          const formatted = items.map((a: any) => ({
            description: a.description,
            assignee: a.assignee?.name || a.assignee?.email || 'Unassigned',
            completed: a.completed,
            timestamp: a.recordingTimestamp,
          }));

          output(formatActionItems(formatted));
          return;
        }
      }

      errorOutput(`Meeting with recording ID ${recordingId} not found.`);
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
