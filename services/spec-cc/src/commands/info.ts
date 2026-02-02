import { Command } from 'commander';
import { readFileSync } from 'fs';
import { findSpec } from '../utils/spec-parser';
import { output, formatSpecInfo, errorOutput } from '../utils/output';

export const info = new Command('info')
  .description('Show spec metadata and path')
  .argument('<slug>', 'Spec slug (filename without .md)')
  .action(async (slug: string) => {
    try {
      const spec = await findSpec(slug);

      if (!spec) {
        errorOutput(`Spec "${slug}" not found`);
      }

      output(formatSpecInfo(spec));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
