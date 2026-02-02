import { Command } from 'commander';
import { loadDiagram, saveDiagram, getDefaultDiagramId } from '../lib/loader';
import { success, error } from '../lib/output';

export const disconnect = new Command('disconnect')
  .description('Remove an edge between two nodes')
  .argument('<source>', 'Source node ID')
  .argument('<target>', 'Target node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('--dry-run', 'Show what would be removed without saving')
  .action((source: string, target: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);

      if (!diagram.edges?.length) {
        error('No edges in diagram');
        process.exit(1);
      }

      // Find the edge
      const edgeIndex = diagram.edges.findIndex(
        e => e.source === source && e.target === target
      );

      if (edgeIndex === -1) {
        error(`Edge not found: ${source} → ${target}`);
        process.exit(1);
      }

      const edge = diagram.edges[edgeIndex];

      if (options.dryRun) {
        console.log('Dry run - would remove edge:');
        console.log(`  ${source} → ${target}${edge.label ? ` [${edge.label}]` : ''}`);
        return;
      }

      // Remove the edge
      diagram.edges.splice(edgeIndex, 1);

      // Clean up empty edges array
      if (diagram.edges.length === 0) {
        delete (diagram as Record<string, unknown>).edges;
      }

      saveDiagram(diagram);

      success(`Removed edge: ${source} → ${target}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
