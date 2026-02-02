import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, formatMeetingList, errorOutput } from '../utils/output';

export const search = new Command('search')
  .description('Search meetings by title or attendee')
  .argument('<query>', 'Search query (matches title or attendee email/domain)')
  .option('--limit <n>', 'Max results', '20')
  .option('--since <date>', 'Filter by date (YYYY-MM-DD)')
  .action(async (query, options) => {
    try {
      const limit = parseInt(options.limit || '20', 10);

      const request: Record<string, any> = {};

      if (options.since) {
        request.createdAfter = new Date(options.since).toISOString();
      }

      // If query looks like a domain, filter by it
      if (query.includes('.') && !query.includes(' ')) {
        request.calendarInviteesDomains = [query];
      }

      const iterator = await fathomClient.listMeetings(request);
      const meetings: any[] = [];

      const queryLower = query.toLowerCase();

      let count = 0;
      for await (const page of iterator) {
        if (!page?.result?.items) break;

        for (const meeting of page.result.items) {
          if (count >= limit) break;

          // Match on title or attendee email
          const title = (meeting.title || meeting.meetingTitle || '').toLowerCase();
          const inviteeEmails = meeting.calendarInvitees
            ?.map((i: any) => i.email?.toLowerCase() || '')
            .join(' ') || '';
          const recorderEmail = meeting.recordedBy?.email?.toLowerCase() || '';

          const matches = title.includes(queryLower) ||
            inviteeEmails.includes(queryLower) ||
            recorderEmail.includes(queryLower);

          if (matches) {
            meetings.push({
              recordingId: meeting.recordingId,
              title: meeting.title || meeting.meetingTitle || 'Untitled',
              createdAt: meeting.createdAt,
              recordedBy: meeting.recordedBy?.email || 'Unknown',
              url: meeting.url,
            });
            count++;
          }
        }

        if (count >= limit) break;
      }

      if (meetings.length === 0) {
        output(`No meetings found matching "${query}".`);
      } else {
        output(formatMeetingList(meetings));
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
