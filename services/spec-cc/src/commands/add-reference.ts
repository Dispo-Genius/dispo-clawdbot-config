import { Command } from 'commander';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { findSpec, getSpecsDir } from '../utils/spec-parser';
import { output, formatSuccess, errorOutput } from '../utils/output';

export const addReference = new Command('add-reference')
  .description('Add exploration reference to spec (auto-restructures if needed)')
  .argument('<slug>', 'Spec slug')
  .argument('<name>', 'Reference name (e.g., "exploration", "synthesis")')
  .option('-c, --content <content>', 'Reference content (or reads from stdin)')
  .action(async (slug: string, name: string, options: { content?: string }) => {
    try {
      const spec = await findSpec(slug);

      if (!spec) {
        errorOutput(`Spec "${slug}" not found`);
      }

      const specsDir = getSpecsDir();
      let refsPath: string;

      // If flat file, need to restructure first
      if (!spec.isFolder) {
        // Create folder structure
        const folderPath = join(specsDir, slug);
        const specPath = join(folderPath, 'SPEC.md');
        refsPath = join(folderPath, 'references');

        mkdirSync(folderPath, { recursive: true });
        mkdirSync(refsPath, { recursive: true });

        // Move flat file to folder
        const content = readFileSync(spec.path, 'utf-8');
        writeFileSync(specPath, content, 'utf-8');

        // Delete original (import unlinkSync)
        const { unlinkSync } = require('fs');
        unlinkSync(spec.path);

        output(`Restructured ${slug} to folder format`);
      } else {
        refsPath = join(dirname(spec.path), 'references');
        if (!existsSync(refsPath)) {
          mkdirSync(refsPath, { recursive: true });
        }
      }

      // Get content
      let refContent = options.content;
      if (!refContent) {
        // Read from stdin if available
        const chunks: Buffer[] = [];
        if (!process.stdin.isTTY) {
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          refContent = Buffer.concat(chunks).toString('utf-8');
        }
      }

      if (!refContent) {
        errorOutput('No content provided. Use --content or pipe content via stdin');
      }

      // Write reference file
      const refFile = join(refsPath, `${name}.md`);
      writeFileSync(refFile, refContent, 'utf-8');

      output(formatSuccess(`Added reference "${name}" to ${slug}`, {
        path: refFile,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
