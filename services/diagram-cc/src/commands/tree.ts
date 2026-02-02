import { Command } from 'commander';
import { loadDiagram, getDefaultDiagramId } from '../lib/loader';
import { formatTree, error } from '../lib/output';

export const tree = new Command('tree')
  .description('Display diagram tree structure')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-r, --root <id>', 'Start from specific node ID')
  .option('--depth <n>', 'Maximum depth to display', 'Infinity')
  .action((options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const rootId = options.root ?? diagram.rootNodeId;
      const depth = options.depth === 'Infinity' ? Infinity : parseInt(options.depth, 10);

      const output = formatTree(diagram, rootId, depth);
      console.log(output);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
