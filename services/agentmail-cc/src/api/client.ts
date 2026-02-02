import { AgentMailClient } from 'agentmail';
import { config } from 'dotenv';
import { resolve } from 'path';
import { homedir } from 'os';

// Load .env from ~/.claude/.env
config({ path: resolve(homedir(), '.claude', '.env') });

let client: AgentMailClient | null = null;

export function getApiKey(): string | undefined {
  return process.env.AGENTMAIL_KEY;
}

export function getAgentMailClient(): AgentMailClient {
  if (client) {
    return client;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'AGENTMAIL_KEY not found. Please add AGENTMAIL_KEY to ~/.claude/.env'
    );
  }

  client = new AgentMailClient({
    apiKey,
  });

  return client;
}
