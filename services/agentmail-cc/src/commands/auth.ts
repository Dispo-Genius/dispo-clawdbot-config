import { getApiKey } from '../api/client.js';

export async function authCommand(options: { status?: boolean }): Promise<void> {
  if (options.status) {
    const apiKey = getApiKey();

    if (!apiKey) {
      console.log('Status: Not configured');
      console.log('\nTo configure AgentMail:');
      console.log('1. Get an API key from https://agentmail.to');
      console.log('2. Add AGENTMAIL_KEY to ~/.claude/.env');
      return;
    }

    // Mask the key for display
    const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
    console.log('Status: Configured');
    console.log(`API Key: ${maskedKey}`);
    console.log('Key location: ~/.claude/.env');
    return;
  }

  // Default behavior: show status
  const apiKey = getApiKey();
  if (apiKey) {
    const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
    console.log('Status: Configured');
    console.log(`API Key: ${maskedKey}`);
  } else {
    console.log('Status: Not configured');
    console.log('\nAdd AGENTMAIL_KEY to ~/.claude/.env');
  }
}
