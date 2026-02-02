import * as http from 'http';
import { handleRequest } from './routes';
import { loadClients } from '../config/clients';
import { initWebhooksDb } from '../db/webhooks';
import { processPendingJobs } from '../orchestrator';

export interface ServerOptions {
  port: number;
  host?: string;
}

let server: http.Server | null = null;
let autoCommitInterval: NodeJS.Timeout | null = null;

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, host = '0.0.0.0' } = options;

  // Load client tokens on startup
  loadClients();

  // Initialize webhooks database
  initWebhooksDb();

  server = http.createServer(async (req, res) => {
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
  });

  return new Promise((resolve, reject) => {
    server!.on('error', (err) => {
      console.error(`[gateway-cc] Server error: ${err.message}`);
      reject(err);
    });

    server!.listen(port, host, () => {
      console.log(`[gateway-cc] HTTP server listening on ${host}:${port}`);
      console.log(`[gateway-cc] Endpoints:`);
      console.log(`  GET  /health                    - Health check`);
      console.log(`  POST /exec                      - Execute service command`);
      console.log(`  POST /webhook/agentmail         - Receive AgentMail webhooks`);
      console.log(`  GET  /webhook/agentmail/events  - Query webhook events`);
      console.log(`  *    /coordination/*            - Multi-session coordination`);
      console.log(`  *    /orchestrator/*            - Activity & auto-commit`);

      // Start auto-commit job processor (every 10 seconds)
      autoCommitInterval = setInterval(() => {
        processPendingJobs().catch((err) => {
          console.error(`[gateway-cc] Auto-commit job processor error: ${err.message}`);
        });
      }, 10000);
      console.log(`[gateway-cc] Auto-commit job processor started (10s interval)`);

      resolve();
    });
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    // Stop auto-commit job processor
    if (autoCommitInterval) {
      clearInterval(autoCommitInterval);
      autoCommitInterval = null;
      console.log('[gateway-cc] Auto-commit job processor stopped');
    }

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
