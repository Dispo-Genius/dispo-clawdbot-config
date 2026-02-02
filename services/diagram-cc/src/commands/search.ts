import { Command } from 'commander';
import { loadDiagram, getDefaultDiagramId } from '../lib/loader';
import { formatNodes, error } from '../lib/output';
import type { NodeType } from '../types';

export const search = new Command('search')
  .description('Search for nodes by query')
  .argument('<query>', 'Search query (matches title, description, or ID)')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-t, --type <type>', 'Filter by node type')
  .option('--limit <n>', 'Limit results', '20')
  .action((query: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const queryLower = query.toLowerCase();
      const limit = parseInt(options.limit, 10);

      let results = diagram.nodes.filter(node => {
        // Text search on id, title, description
        const matches =
          node.id.toLowerCase().includes(queryLower) ||
          node.title.toLowerCase().includes(queryLower) ||
          (node.description?.toLowerCase().includes(queryLower) ?? false);

        if (!matches) return false;

        // Type filter
        if (options.type && node.type !== options.type) {
          return false;
        }

        return true;
      });

      // Apply limit
      if (results.length > limit) {
        results = results.slice(0, limit);
        console.log(`Showing first ${limit} results...\n`);
      }

      if (results.length === 0) {
        console.log('No nodes found matching query.');
        return;
      }

      console.log(`Found ${results.length} node(s):\n`);
      console.log(formatNodes(results));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
