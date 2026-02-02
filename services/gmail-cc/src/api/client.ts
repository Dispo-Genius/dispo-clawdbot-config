import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  loadCredentials,
  loadTokens,
  saveTokens,
  getClientConfig,
} from '../config/auth.js';
import type { TokenData } from '../types.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

let oauth2Client: OAuth2Client | null = null;
let gmailClient: gmail_v1.Gmail | null = null;

export function getScopes(): string[] {
  return SCOPES;
}

export function createOAuth2Client(): OAuth2Client {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error(
      'Gmail credentials not found. Please download your OAuth credentials from Google Cloud Console and save to ~/.claude/gmail-credentials.json'
    );
  }

  const { clientId, clientSecret, redirectUri } = getClientConfig(credentials);

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(client: OAuth2Client): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });
}

export async function exchangeCodeForTokens(
  client: OAuth2Client,
  code: string
): Promise<TokenData> {
  const { tokens } = await client.getToken(code);

  const tokenData: TokenData = {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    scope: tokens.scope!,
    token_type: tokens.token_type!,
    expiry_date: tokens.expiry_date!,
  };

  saveTokens(tokenData);
  return tokenData;
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  if (oauth2Client) {
    return oauth2Client;
  }

  const tokens = loadTokens();
  if (!tokens) {
    throw new Error(
      'Not authenticated. Run "gmail-cc auth" first to authenticate with Gmail.'
    );
  }

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Set up token refresh handler
  client.on('tokens', (newTokens) => {
    const updatedTokens: TokenData = {
      ...tokens,
      access_token: newTokens.access_token || tokens.access_token,
      expiry_date: newTokens.expiry_date || tokens.expiry_date,
    };
    if (newTokens.refresh_token) {
      updatedTokens.refresh_token = newTokens.refresh_token;
    }
    saveTokens(updatedTokens);
  });

  oauth2Client = client;
  return client;
}

export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  if (gmailClient) {
    return gmailClient;
  }

  const auth = await getAuthenticatedClient();
  gmailClient = google.gmail({ version: 'v1', auth });
  return gmailClient;
}
