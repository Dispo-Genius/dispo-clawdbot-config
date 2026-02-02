import { Command } from 'commander';
import { findAllSpecs, VALID_STATUSES, SpecStatus } from '../utils/spec-parser';
import { output, formatSpecList, errorOutput } from '../utils/output';

export const list = new Command('list')
  .description('List all specs with status')
  .option('-s, --status <status>', 'Filter by status (draft|pending|approved|blocked|completed)')
  .action(async (options: { status?: string }) => {
    try {
      let specs = await findAllSpecs();

      // Filter by status if specified
      if (options.status) {
        const status = options.status.toLowerCase() as SpecStatus;
        if (!VALID_STATUSES.includes(status)) {
          errorOutput(`Invalid status "${options.status}". Valid: ${VALID_STATUSES.join(', ')}`);
        }
        specs = specs.filter(s => s.status === status);
      }

      output(formatSpecList(specs));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
