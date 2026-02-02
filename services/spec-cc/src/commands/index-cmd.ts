import { Command } from 'commander';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findAllSpecs, getSpecsDir, SpecStatus } from '../utils/spec-parser';
import { output, formatSuccess, errorOutput } from '../utils/output';

// Generate INDEX.md content
export async function generateIndex(specsDir: string): Promise<string> {
  const specs = await findAllSpecs(specsDir);

  // Group by status
  const byStatus: Record<SpecStatus, typeof specs> = {
    draft: [],
    pending: [],
    approved: [],
    blocked: [],
    completed: [],
  };

  for (const spec of specs) {
    const status = spec.status as SpecStatus;
    if (byStatus[status]) {
      byStatus[status].push(spec);
    }
  }

  // Build markdown
  const lines: string[] = ['# Specs Index', ''];

  const statusOrder: SpecStatus[] = ['pending', 'approved', 'draft', 'blocked', 'completed'];

  for (const status of statusOrder) {
    const statusSpecs = byStatus[status];
    if (statusSpecs.length === 0) continue;

    const title = status.charAt(0).toUpperCase() + status.slice(1);
    lines.push(`## ${title}`, '');

    for (const spec of statusSpecs) {
      const relativePath = spec.isFolder ? `./${spec.slug}/SPEC.md` : `./${spec.slug}.md`;
      const linearSuffix = spec.linearId ? ` -> ${spec.linearId}` : '';
      lines.push(`- [${spec.slug}](${relativePath})${linearSuffix}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// Write INDEX.md
async function writeIndex(specsDir: string): Promise<void> {
  const content = await generateIndex(specsDir);
  const indexPath = join(specsDir, 'INDEX.md');
  writeFileSync(indexPath, content, 'utf-8');
}

// Check if INDEX.md is in sync
async function checkIndex(specsDir: string): Promise<{ inSync: boolean; diff?: string }> {
  const expected = await generateIndex(specsDir);
  const indexPath = join(specsDir, 'INDEX.md');

  if (!existsSync(indexPath)) {
    return { inSync: false, diff: 'INDEX.md does not exist' };
  }

  const actual = readFileSync(indexPath, 'utf-8');

  if (actual.trim() === expected.trim()) {
    return { inSync: true };
  }

  return { inSync: false, diff: 'Content differs from generated' };
}

export const indexCmd = new Command('index')
  .description('Regenerate INDEX.md from spec files')
  .option('--check', 'Verify INDEX.md is in sync without modifying')
  .action(async (options: { check?: boolean }) => {
    try {
      const specsDir = getSpecsDir();

      if (!existsSync(specsDir)) {
        errorOutput(`Specs directory not found: ${specsDir}`);
      }

      if (options.check) {
        const result = await checkIndex(specsDir);
        if (result.inSync) {
          output(formatSuccess('INDEX.md is in sync'));
        } else {
          errorOutput(`INDEX.md out of sync: ${result.diff}`);
        }
      } else {
        await writeIndex(specsDir);
        const specs = await findAllSpecs(specsDir);
        output(formatSuccess('INDEX.md regenerated', { specs: specs.length }));
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
