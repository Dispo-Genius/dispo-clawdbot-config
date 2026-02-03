import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { handleRequest } from './routes';
import { initWebhooksDb } from '../db/webhooks';

export interface ServerOptions {
  port: number;
  host?: string;
  https?: boolean;
  certDir?: string;
  hostname?: string;
}

let server: http.Server | https.Server | null = null;

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, host = '0.0.0.0', https: useHttps = false, certDir, hostname } = options;

  // Client authentication now uses 1Password service account tokens
  // No client registry to load - 1Password validates tokens directly
  console.log('[gateway-cc] Auth: 1Password service account tokens');

  // Initialize webhooks database
  initWebhooksDb();

  const requestHandler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      await handleRequest(req, res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[gateway-cc] Unhandled error: ${msg}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  };

  if (useHttps) {
    const certDirPath = certDir || path.join(process.env.HOME || '', '.gateway-certs');
    const certHostname = hostname || 'polariss-mac-mini-1.tail3351a2.ts.net';
    const certPath = path.join(certDirPath, `${certHostname}.crt`);
    const keyPath = path.join(certDirPath, `${certHostname}.key`);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      throw new Error(`HTTPS certs not found at ${certDirPath}. Run: tailscale cert --cert-file ${certPath} --key-file ${keyPath} ${certHostname}`);
    }

    const httpsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
    server = https.createServer(httpsOptions, requestHandler);
  } else {
    server = http.createServer(requestHandler);
  }

  const protocol = useHttps ? 'HTTPS' : 'HTTP';

  return new Promise((resolve, reject) => {
    server!.on('error', (err) => {
      console.error(`[gateway-cc] Server error: ${err.message}`);
      reject(err);
    });

    server!.listen(port, host, () => {
      console.log(`[gateway-cc] ${protocol} server listening on ${host}:${port}`);
      console.log(`[gateway-cc] Endpoints:`);
      console.log(`  GET  /health                    - Health check`);
      console.log(`  POST /exec                      - Execute service command`);
      console.log(`  POST /webhook/agentmail         - Receive AgentMail webhooks`);
      console.log(`  GET  /webhook/agentmail/events  - Query webhook events`);
      console.log(`  *    /coordination/*            - Multi-session coordination`);
      console.log(`  *    /orchestrator/*            - Activity & PR watch`);

      resolve();
    });
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[gateway-cc] Server stopped');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
