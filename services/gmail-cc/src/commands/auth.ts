import http from 'http';
import { URL } from 'url';
import { createOAuth2Client, getAuthUrl, exchangeCodeForTokens, getScopes } from '../api/client.js';
import { loadCredentials, loadTokens, getCredentialsPath, getTokenPath, clearTokens } from '../config/auth.js';

const DEFAULT_PORT = 3000;
const FALLBACK_PORTS = [3001, 3002, 3003, 8080, 8081];
const TIMEOUT_MS = 120000; // 2 minutes

async function findAvailablePort(startPort: number): Promise<number> {
  const ports = [startPort, ...FALLBACK_PORTS];

  for (const port of ports) {
    const available = await new Promise<boolean>((resolve) => {
      const server = http.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });

    if (available) return port;
  }

  throw new Error(`No available ports found. Tried: ${ports.join(', ')}`);
}

function formatTokenExpiry(expiryDate: number): string {
  const now = Date.now();
  const diff = expiryDate - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  return `${hours}h ${minutes}m`;
}

export async function authCommand(options: { logout?: boolean; status?: boolean }): Promise<void> {
  // Logout
  if (options.logout) {
    clearTokens();
    console.log('Logged out. Tokens cleared.');
    return;
  }

  // Status check
  if (options.status) {
    const tokens = loadTokens();
    if (!tokens) {
      console.log('Status: Not authenticated');
      console.log(`\nRun "gmail-cc auth" to authenticate.`);
      return;
    }

    const isExpired = tokens.expiry_date < Date.now();
    console.log(`Status: ${isExpired ? 'Token expired (will auto-refresh)' : 'Authenticated'}`);
    console.log(`Token expires in: ${formatTokenExpiry(tokens.expiry_date)}`);
    console.log(`Scopes: ${tokens.scope}`);
    console.log(`Token file: ${getTokenPath()}`);
    return;
  }

  // Check for credentials file
  const credentials = loadCredentials();
  if (!credentials) {
    console.error(`Error: Gmail credentials not found.

Setup Instructions:
──────────────────────────────────────────────────────────
1. Go to https://console.cloud.google.com/
2. Create a project (or select existing)
3. Enable the Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API" → Enable it
4. Configure OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" → Create
   - Fill in app name, support email
   - Add scopes: gmail.readonly, gmail.send, gmail.modify
   - Add yourself as test user
5. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Select "Desktop app"
   - Download the JSON file
6. Save the JSON file as:
   ${getCredentialsPath()}
7. Run this command again
──────────────────────────────────────────────────────────`);
    process.exit(1);
  }

  // Validate credentials structure
  const config = credentials.installed || credentials.web;
  if (!config?.client_id || !config?.client_secret) {
    console.error(`Error: Invalid credentials file format.

The credentials file exists but appears to be malformed.
Expected fields: client_id, client_secret, redirect_uris

Please download a fresh credentials JSON from Google Cloud Console.
File: ${getCredentialsPath()}`);
    process.exit(1);
  }

  let client;
  try {
    client = createOAuth2Client();
  } catch (err) {
    console.error(`Error creating OAuth client: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const port = await findAvailablePort(DEFAULT_PORT);
  const authUrl = getAuthUrl(client);

  console.log('Opening browser for Gmail authentication...');
  console.log(`\nIf browser doesn't open automatically, visit this URL:\n`);
  console.log(`  ${authUrl}\n`);
  console.log('Note: You may see "Google hasn\'t verified this app" warning.');
  console.log('Click "Advanced" → "Go to <app-name> (unsafe)" to proceed.\n');

  // Open browser
  try {
    const open = (await import('open')).default;
    await open(authUrl);
  } catch {
    console.log('Could not open browser automatically. Please visit the URL above.');
  }

  // Start local server with timeout
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '', `http://localhost:${port}`);
      const code = url.searchParams.get('code');

      if (code) {
        try {
          await exchangeCodeForTokens(client, code);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #22c55e;">✓ Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `);

          console.log('\n✓ Authentication successful! Tokens saved.');
          console.log(`  Token file: ${getTokenPath()}`);
          console.log(`  Scopes: ${getScopes().join(', ')}`);

          server.close();
          process.exit(0);
        } catch (tokenErr) {
          const errMsg = tokenErr instanceof Error ? tokenErr.message : 'Unknown error';
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1 style="color: #ef4444;">Token Exchange Failed</h1>
                <p>${errMsg}</p>
              </body>
            </html>
          `);
          console.error(`\n✗ Token exchange failed: ${errMsg}`);
          server.close();
          process.exit(1);
        }
      } else {
        const error = url.searchParams.get('error');
        const errorDesc = url.searchParams.get('error_description') || '';

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1 style="color: #ef4444;">Authentication Failed</h1>
              <p><strong>Error:</strong> ${error || 'Unknown error'}</p>
              ${errorDesc ? `<p>${errorDesc}</p>` : ''}
            </body>
          </html>
        `);

        console.error(`\n✗ Authentication failed: ${error}`);
        if (errorDesc) console.error(`  ${errorDesc}`);

        if (error === 'access_denied') {
          console.error('\nYou denied access. Run "gmail-cc auth" again to retry.');
        }

        server.close();
        process.exit(1);
      }
    } catch (err) {
      console.error('Error processing callback:', err);
      res.writeHead(500);
      res.end('Internal error');
      server.close();
      process.exit(1);
    }
  });

  // Timeout handler
  const timeout = setTimeout(() => {
    console.error(`\n✗ Authentication timed out after ${TIMEOUT_MS / 1000} seconds.`);
    console.error('Run "gmail-cc auth" to try again.');
    server.close();
    process.exit(1);
  }, TIMEOUT_MS);

  server.on('close', () => clearTimeout(timeout));

  server.listen(port, () => {
    console.log(`Waiting for OAuth callback on http://localhost:${port}...`);
    console.log(`(Timeout: ${TIMEOUT_MS / 1000} seconds)\n`);
  });

  server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
    process.exit(1);
  });
}
