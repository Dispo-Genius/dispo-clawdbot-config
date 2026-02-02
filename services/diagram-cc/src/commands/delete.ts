import { Command } from 'commander';
import { loadDiagram, saveDiagram, findNode, getDefaultDiagramId, applyPositions } from '../lib/loader';
import { autoLayoutSubtree } from '../lib/layout';
import { canDelete } from '../lib/validation';
import { formatNode, success, error } from '../lib/output';

export const deleteCmd = new Command('delete')
  .description('Delete a node (must have no children)')
  .argument('<id>', 'Node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('--force', 'Skip confirmation')
  .option('--dry-run', 'Show what would be deleted without saving')
  .action((id: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const node = findNode(diagram, id);

      if (!node) {
        error(`Node not found: ${id}`);
        process.exit(1);
      }

      // Check if node can be deleted
      const validation = canDelete(node);
      if (!validation.valid) {
        error('Cannot delete node:');
        validation.errors.forEach(e => console.log(`  - ${e}`));
        process.exit(1);
      }

      // Cannot delete root node
      if (node.id === diagram.rootNodeId) {
        error('Cannot delete root node');
        process.exit(1);
      }

      if (options.dryRun) {
        console.log('Dry run - would delete:');
        console.log(formatNode(node));
        return;
      }

      // Remove from parent's children array
      if (node.parentId) {
        const parent = findNode(diagram, node.parentId);
        if (parent?.children) {
          parent.children = parent.children.filter(c => c !== id);
          if (parent.children.length === 0) {
            delete (parent as Record<string, unknown>).children;
          }
        }
      }

      // Remove any edges involving this node
      if (diagram.edges) {
        diagram.edges = diagram.edges.filter(
          e => e.source !== id && e.target !== id
        );
        if (diagram.edges.length === 0) {
          delete (diagram as Record<string, unknown>).edges;
        }
      }

      // Remove node from nodes array
      const nodeIndex = diagram.nodes.findIndex(n => n.id === id);
      if (nodeIndex !== -1) {
        diagram.nodes.splice(nodeIndex, 1);
      }

      // Save diagram
      saveDiagram(diagram);

      // Auto-layout from deleted node's parent
      if (node.parentId) {
        const positions = autoLayoutSubtree(diagram.nodes, diagram.edges || [], node.parentId);
        applyPositions(diagram, positions);
      }

      success(`Deleted node: ${id}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
