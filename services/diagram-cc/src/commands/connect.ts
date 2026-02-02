import { Command } from 'commander';
import { loadDiagram, saveDiagram, findNode, getDefaultDiagramId, applyPositions } from '../lib/loader';
import { autoLayoutSubtree } from '../lib/layout';
import { success, error } from '../lib/output';

export const connect = new Command('connect')
  .description('Create an edge between two nodes')
  .argument('<source>', 'Source node ID')
  .argument('<target>', 'Target node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-l, --label <label>', 'Edge label')
  .option('--dry-run', 'Show what would be created without saving')
  .action((source: string, target: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);

      // Validate source exists
      const sourceNode = findNode(diagram, source);
      if (!sourceNode) {
        error(`Source node not found: ${source}`);
        process.exit(1);
      }

      // Validate target exists
      const targetNode = findNode(diagram, target);
      if (!targetNode) {
        error(`Target node not found: ${target}`);
        process.exit(1);
      }

      // Cannot connect to self
      if (source === target) {
        error('Cannot connect node to itself');
        process.exit(1);
      }

      // Initialize edges array if needed
      if (!diagram.edges) {
        diagram.edges = [];
      }

      // Check if edge already exists
      const existingEdge = diagram.edges.find(
        e => e.source === source && e.target === target
      );

      if (existingEdge) {
        if (options.label && existingEdge.label !== options.label) {
          // Update label
          if (options.dryRun) {
            console.log(`Dry run - would update edge label: ${source} → ${target}`);
            console.log(`  "${existingEdge.label ?? '(none)'}" → "${options.label}"`);
            return;
          }
          existingEdge.label = options.label;
          saveDiagram(diagram);
          success(`Updated edge label: ${source} → ${target}`);
        } else {
          console.log(`Edge already exists: ${source} → ${target}`);
        }
        return;
      }

      // Create new edge
      const edge = {
        source,
        target,
        ...(options.label && { label: options.label }),
      };

      if (options.dryRun) {
        console.log('Dry run - would create edge:');
        console.log(`  ${source} → ${target}${options.label ? ` [${options.label}]` : ''}`);
        return;
      }

      diagram.edges.push(edge);
      saveDiagram(diagram);

      // Auto-layout from source node's parent
      const parentId = sourceNode.parentId || source;
      const positions = autoLayoutSubtree(diagram.nodes, diagram.edges, parentId);
      applyPositions(diagram, positions);

      success(`Created edge: ${source} → ${target}${options.label ? ` [${options.label}]` : ''}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
