import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, errorOutput } from '../utils/output';

export const getMeeting = new Command('get-meeting')
  .description('Get meeting details by recording ID')
  .argument('<recordingId>', 'The recording ID')
  .option('--include-transcript', 'Include full transcript')
  .option('--include-summary', 'Include meeting summary')
  .option('--include-actions', 'Include action items')
  .action(async (recordingId, options) => {
    try {
      const id = parseInt(recordingId, 10);
      if (isNaN(id)) {
        errorOutput('Invalid recording ID. Must be a number.');
      }

      const request: Record<string, any> = {};

      if (options.includeTranscript) request.includeTranscript = true;
      if (options.includeSummary) request.includeSummary = true;
      if (options.includeActions) request.includeActionItems = true;

      const iterator = await fathomClient.listMeetings(request);

      for await (const page of iterator) {
        if (!page?.result?.items) continue;

        const meeting = page.result.items.find((m: any) => m.recordingId === id);
        if (meeting) {
          const result: Record<string, any> = {
            recordingId: meeting.recordingId,
            title: meeting.title || meeting.meetingTitle || 'Untitled',
            createdAt: meeting.createdAt,
            scheduledStartTime: meeting.scheduledStartTime,
            scheduledEndTime: meeting.scheduledEndTime,
            recordingStartTime: meeting.recordingStartTime,
            recordingEndTime: meeting.recordingEndTime,
            recordedBy: {
              email: meeting.recordedBy?.email,
              name: meeting.recordedBy?.name,
            },
            calendarInvitees: meeting.calendarInvitees?.map((i: any) => ({
              email: i.email,
              name: i.name,
            })),
            url: meeting.url,
            shareUrl: meeting.shareUrl,
          };

          if (options.includeSummary && meeting.defaultSummary) {
            result.summary = meeting.defaultSummary.markdownFormatted;
          }

          if (options.includeActions && meeting.actionItems) {
            result.actionItems = meeting.actionItems.map((a: any) => ({
              description: a.description,
              assignee: a.assignee,
              completed: a.completed,
              timestamp: a.recordingTimestamp,
            }));
          }

          if (options.includeTranscript && meeting.transcript) {
            result.transcript = meeting.transcript.map((t: any) => ({
              speaker: t.speaker,
              text: t.text,
              timestamp: t.timestamp,
            }));
          }

          output(result);
          return;
        }
      }

      errorOutput(`Meeting with recording ID ${recordingId} not found.`);
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
