import { Command } from 'commander';
import { loadDiagram, findNode, getDefaultDiagramId, getChildren, getPathToNode } from '../lib/loader';
import { formatNode, formatNodes, formatPath, error } from '../lib/output';
import * as fs from 'fs';
import * as path from 'path';

export const get = new Command('get')
  .description('Get a node by ID')
  .argument('<id>', 'Node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('--with-docs', 'Include documentation content if available')
  .option('--with-children', 'Include child nodes')
  .action((id: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const node = findNode(diagram, id);

      if (!node) {
        error(`Node not found: ${id}`);
        process.exit(1);
      }

      // Output the node
      console.log(formatNode(node));

      // Show path from root
      const nodePath = getPathToNode(diagram, id);
      if (nodePath.length > 1) {
        console.log('\nPath: ' + formatPath(nodePath));
      }

      // Include children if requested
      if (options.withChildren && node.children?.length) {
        const children = getChildren(diagram, id);
        console.log('\nChildren:');
        console.log(formatNodes(children));
      }

      // Include docs if requested
      if (options.withDocs && node.docsPath) {
        const docsFullPath = path.join('/Users/andyrong/dg-prototype', node.docsPath);
        if (fs.existsSync(docsFullPath)) {
          const docsContent = fs.readFileSync(docsFullPath, 'utf-8');
          console.log('\n--- Documentation ---');
          console.log(docsContent);
        } else {
          console.log(`\nDocs path specified but file not found: ${node.docsPath}`);
        }
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
