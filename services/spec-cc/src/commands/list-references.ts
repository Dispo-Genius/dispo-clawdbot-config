import { Command } from 'commander';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { findSpec } from '../utils/spec-parser';
import { output, errorOutput, getFormat } from '../utils/output';

export const listReferences = new Command('list-references')
  .description('List references for a spec')
  .argument('<slug>', 'Spec slug')
  .action(async (slug: string) => {
    try {
      const spec = await findSpec(slug);

      if (!spec) {
        errorOutput(`Spec "${slug}" not found`);
      }

      if (!spec.isFolder) {
        output(getFormat() === 'json'
          ? JSON.stringify({ success: true, slug, references: [], message: 'Flat file spec has no references' }, null, 2)
          : `refs[0]{}:${slug} is flat file`
        );
        return;
      }

      const refsPath = join(dirname(spec.path), 'references');

      if (!existsSync(refsPath)) {
        output(getFormat() === 'json'
          ? JSON.stringify({ success: true, slug, references: [] }, null, 2)
          : `refs[0]{}:`
        );
        return;
      }

      const refs = readdirSync(refsPath)
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const fullPath = join(refsPath, f);
          const stats = statSync(fullPath);
          return {
            name: f.replace('.md', ''),
            path: fullPath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          };
        });

      if (getFormat() === 'json') {
        output(JSON.stringify({ success: true, slug, references: refs }, null, 2));
      } else {
        if (refs.length === 0) {
          output(`refs[0]{}:`);
        } else {
          const header = `refs[${refs.length}]{name|size|modified}:`;
          const rows = refs.map(r => `${r.name}|${r.size}|${r.modified.split('T')[0]}`);
          output([header, ...rows].join('\n'));
        }
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
