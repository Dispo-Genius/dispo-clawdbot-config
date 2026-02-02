import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { findSpec } from '../utils/spec-parser';
import { output, errorOutput, getFormat } from '../utils/output';

export const getReference = new Command('get-reference')
  .description('View reference content')
  .argument('<slug>', 'Spec slug')
  .argument('<name>', 'Reference name (without .md)')
  .action(async (slug: string, name: string) => {
    try {
      const spec = await findSpec(slug);

      if (!spec) {
        errorOutput(`Spec "${slug}" not found`);
      }

      if (!spec.isFolder) {
        errorOutput(`Spec "${slug}" is a flat file and has no references`);
      }

      const refsPath = join(dirname(spec.path), 'references');
      const refFile = join(refsPath, `${name}.md`);

      if (!existsSync(refFile)) {
        errorOutput(`Reference "${name}" not found in spec "${slug}"`);
      }

      const content = readFileSync(refFile, 'utf-8');

      if (getFormat() === 'json') {
        output(JSON.stringify({
          success: true,
          slug,
          reference: name,
          path: refFile,
          content,
        }, null, 2));
      } else {
        output(content);
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
