import { Command } from 'commander';
import { loadDiagram, findNode, getDefaultDiagramId, getPathToNode } from '../lib/loader';
import { formatPath, formatNodes, error } from '../lib/output';
import { getGlobalFormat } from '../types';

export const path = new Command('path')
  .description('Show path from root to a node')
  .argument('<id>', 'Node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-v, --verbose', 'Show full node details for each step')
  .action((id: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const node = findNode(diagram, id);

      if (!node) {
        error(`Node not found: ${id}`);
        process.exit(1);
      }

      const nodePath = getPathToNode(diagram, id);

      if (options.verbose || getGlobalFormat() === 'json') {
        console.log(formatNodes(nodePath));
      } else {
        console.log(formatPath(nodePath));
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
