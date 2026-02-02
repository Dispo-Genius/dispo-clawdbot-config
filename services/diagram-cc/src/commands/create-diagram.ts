import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadIndex } from '../lib/loader';
import { success, error } from '../lib/output';
import type { Diagram, DiagramIndexEntry } from '../types';

// Base path for diagram data
const PROJECT_ROOT = '/Users/andyrong/dg-prototype';
const DIAGRAMS_DIR = path.join(PROJECT_ROOT, 'public/data/diagrams');
const INDEX_FILE = path.join(DIAGRAMS_DIR, 'index.json');

/**
 * Slugify a title into a valid diagram ID
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate that a diagram ID is unique
 */
function isIdUnique(id: string): boolean {
  const index = loadIndex();
  return !index.diagrams.some(d => d.id === id);
}

export const createDiagram = new Command('create-diagram')
  .description('Create a new top-level diagram')
  .argument('<title>', 'Diagram title')
  .option('--id <id>', 'Override auto-generated ID')
  .option('--desc <description>', 'Diagram description')
  .option('--dry-run', 'Show what would be created without saving')
  .action((title: string, options) => {
    try {
      // Validate title
      if (!title || title.trim().length === 0) {
        error('Title is required');
        process.exit(1);
      }

      // Generate or use provided ID
      let diagramId = options.id || slugify(title);

      // Ensure ID doesn't start with a number
      if (/^\d/.test(diagramId)) {
        diagramId = `diagram-${diagramId}`;
      }

      // Validate ID is unique
      if (!isIdUnique(diagramId)) {
        error(`Diagram '${diagramId}' already exists`);
        process.exit(1);
      }

      // Build diagram structure
      const today = new Date().toISOString().split('T')[0];
      const description = options.desc || `System diagram for ${title}`;

      const diagram: Diagram = {
        id: diagramId,
        title: title.trim(),
        description,
        version: '1.0.0',
        lastUpdated: today,
        rootNodeId: 'root',
        nodes: [
          {
            id: 'root',
            type: 'system',
            title: title.trim(),
            description,
            children: [],
          },
        ],
        edges: [],
      };

      const indexEntry: DiagramIndexEntry = {
        id: diagramId,
        title: title.trim(),
        description,
        file: `${diagramId}/`,
        status: 'planned',
        lastUpdated: today,
      };

      if (options.dryRun) {
        console.log('Dry run - would create:');
        console.log(`\nFolder: ${DIAGRAMS_DIR}/${diagramId}/`);
        console.log(`  ├── index.json`);
        console.log(`  └── nodes/`);
        console.log(`\nIndex entry:`);
        console.log(JSON.stringify(indexEntry, null, 2));
        console.log(`\nDiagram:`);
        console.log(JSON.stringify(diagram, null, 2));
        return;
      }

      // Create folder structure
      const diagramFolder = path.join(DIAGRAMS_DIR, diagramId);
      const nodesFolder = path.join(diagramFolder, 'nodes');

      fs.mkdirSync(diagramFolder, { recursive: true });
      fs.mkdirSync(nodesFolder, { recursive: true });

      // Write diagram index.json
      const diagramPath = path.join(diagramFolder, 'index.json');
      fs.writeFileSync(diagramPath, JSON.stringify(diagram, null, 2) + '\n', 'utf-8');

      // Update main index.json
      const index = loadIndex();
      index.diagrams.push(indexEntry);

      const tempPath = `${INDEX_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
      fs.renameSync(tempPath, INDEX_FILE);

      success(`Created diagram: ${diagramId}`);
      console.log(`  Folder: ${diagramFolder}/`);
      console.log(`  Root node: ${diagram.nodes[0].title}`);
      console.log(`\nNext: diagram-cc create <type> <title> --parent root -d ${diagramId}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
