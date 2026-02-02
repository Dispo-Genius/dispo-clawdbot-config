import { Fathom } from 'fathom-typescript';

const API_KEY = process.env.FATHOM_API_KEY;

// Lazy initialization - only create client when API key exists
let _client: Fathom | null = null;

export function getFathomClient(): Fathom {
  if (!API_KEY) {
    console.log(JSON.stringify({ success: false, error: 'FATHOM_API_KEY environment variable not set. Add it to ~/.claude/.env' }));
    process.exit(1);
  }

  if (!_client) {
    _client = new Fathom({
      security: {
        apiKeyAuth: API_KEY,
      },
    });
  }

  return _client;
}

// For backwards compatibility - will throw if no API key
export const fathomClient = {
  get listMeetings() {
    return getFathomClient().listMeetings.bind(getFathomClient());
  },
  get getRecordingSummary() {
    return getFathomClient().getRecordingSummary.bind(getFathomClient());
  },
  get getRecordingTranscript() {
    return getFathomClient().getRecordingTranscript.bind(getFathomClient());
  },
  get listTeams() {
    return getFathomClient().listTeams.bind(getFathomClient());
  },
  get listTeamMembers() {
    return getFathomClient().listTeamMembers.bind(getFathomClient());
  },
};
