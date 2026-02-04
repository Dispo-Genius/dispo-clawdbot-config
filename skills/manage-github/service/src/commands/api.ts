import { Command } from 'commander';
import { ghRaw } from '../api/client';
import { output, errorOutput } from '../utils/output';

export const api = new Command('api')
  .description('Raw gh api passthrough')
  .argument('<endpoint>', 'API endpoint (e.g. repos/owner/repo/actions/runs)')
  .option('--method <method>', 'HTTP method: GET, POST, PUT, PATCH, DELETE', 'GET')
  .option('--field <fields...>', 'Key=value fields to include in request body')
  .action((endpoint: string, options: { method?: string; field?: string[] }) => {
    try {
      const args: string[] = [endpoint];

      if (options.method && options.method !== 'GET') {
        args.push('--method', options.method);
      }

      if (options.field) {
        for (const f of options.field) {
          args.push('--field', f);
        }
      }

      const result = ghRaw('api', args);

      // Try to pretty-print JSON, fall back to raw output
      try {
        const parsed = JSON.parse(result);
        output(JSON.stringify(parsed, null, 2));
      } catch {
        output(result);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
