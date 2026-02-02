import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, formatMeetingList, errorOutput } from '../utils/output';

export const listMeetings = new Command('list-meetings')
  .description('List recent meetings')
  .option('--limit <n>', 'Max meetings to return', '20')
  .option('--since <date>', 'Filter by date (YYYY-MM-DD)')
  .option('--until <date>', 'Filter by end date (YYYY-MM-DD)')
  .option('--team <team>', 'Filter by team name')
  .option('--include-summary', 'Include meeting summaries')
  .option('--include-actions', 'Include action items')
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit || '20', 10);

      const request: Record<string, any> = {};

      if (options.since) {
        request.createdAfter = new Date(options.since).toISOString();
      }
      if (options.until) {
        request.createdBefore = new Date(options.until).toISOString();
      }
      if (options.team) {
        request.teams = [options.team];
      }
      if (options.includeSummary) {
        request.includeSummary = true;
      }
      if (options.includeActions) {
        request.includeActionItems = true;
      }

      const iterator = await fathomClient.listMeetings(request);
      const meetings: any[] = [];

      let count = 0;
      for await (const page of iterator) {
        if (!page?.result?.items) break;

        for (const meeting of page.result.items) {
          if (count >= limit) break;

          meetings.push({
            recordingId: meeting.recordingId,
            title: meeting.title || meeting.meetingTitle || 'Untitled',
            createdAt: meeting.createdAt,
            recordedBy: meeting.recordedBy?.email || 'Unknown',
            url: meeting.url,
            summary: meeting.defaultSummary?.markdownFormatted,
            actionItems: meeting.actionItems?.map((a: any) => ({
              description: a.description,
              completed: a.completed,
            })),
          });
          count++;
        }

        if (count >= limit) break;
      }

      output(formatMeetingList(meetings));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
