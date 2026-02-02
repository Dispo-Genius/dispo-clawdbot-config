import fs from 'fs';
import path from 'path';
import os from 'os';
import type { OAuthCredentials, TokenData } from '../types.js';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const CREDENTIALS_PATH = path.join(CLAUDE_DIR, 'gmail-credentials.json');
const TOKEN_PATH = path.join(CLAUDE_DIR, 'gmail-tokens.json');

export function getCredentialsPath(): string {
  return CREDENTIALS_PATH;
}

export function getTokenPath(): string {
  return TOKEN_PATH;
}

export function loadCredentials(): OAuthCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content) as OAuthCredentials;
  } catch {
    return null;
  }
}

export function loadTokens(): TokenData | null {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return null;
    }
    const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
    return JSON.parse(content) as TokenData;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenData): void {
  // Ensure .claude directory exists
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

export function clearTokens(): void {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
}

export function getClientConfig(credentials: OAuthCredentials): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const config = credentials.installed || credentials.web;
  if (!config) {
    throw new Error('Invalid credentials format');
  }
  return {
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: config.redirect_uris[0] || 'http://localhost:3000/oauth2callback',
  };
}
