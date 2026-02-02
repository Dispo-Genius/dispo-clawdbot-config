import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, errorOutput } from '../utils/output';

export const getTranscript = new Command('get-transcript')
  .description('Get meeting transcript by recording ID')
  .argument('<recordingId>', 'The recording ID')
  .option('--format <format>', 'Output format: text, json', 'text')
  .action(async (recordingId, options) => {
    try {
      const id = parseInt(recordingId, 10);
      if (isNaN(id)) {
        errorOutput('Invalid recording ID. Must be a number.');
      }

      // Use listMeetings with includeTranscript since getRecordingTranscript requires destinationUrl
      const iterator = await fathomClient.listMeetings({
        includeTranscript: true,
      });

      for await (const page of iterator) {
        if (!page?.result?.items) continue;

        const meeting = page.result.items.find((m: any) => m.recordingId === id);
        if (meeting) {
          const transcript = meeting.transcript;

          if (!transcript || transcript.length === 0) {
            errorOutput('Transcript not found or not yet available.');
          }

          if (options.format === 'json') {
            output(transcript);
          } else {
            // Format as readable text
            const lines = transcript.map((t: any) => {
              const speakerName = t.speaker?.name || t.speaker?.email || 'Unknown';
              return `[${t.timestamp}] ${speakerName}: ${t.text}`;
            });
            output(lines.join('\n'));
          }
          return;
        }
      }

      errorOutput(`Meeting with recording ID ${recordingId} not found.`);
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
