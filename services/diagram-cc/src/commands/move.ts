import { Command } from 'commander';
import { loadDiagram, saveDiagram, findNode, getDefaultDiagramId, applyPositions } from '../lib/loader';
import { autoLayoutSubtree } from '../lib/layout';
import { formatNode, success, error } from '../lib/output';

export const move = new Command('move')
  .description('Move a node to a new parent')
  .argument('<id>', 'Node ID to move')
  .requiredOption('--to <parentId>', 'New parent node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('--dry-run', 'Show what would be moved without saving')
  .action((id: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const node = findNode(diagram, id);

      if (!node) {
        error(`Node not found: ${id}`);
        process.exit(1);
      }

      const newParent = findNode(diagram, options.to);
      if (!newParent) {
        error(`New parent not found: ${options.to}`);
        process.exit(1);
      }

      // Cannot move to self
      if (id === options.to) {
        error('Cannot move node to itself');
        process.exit(1);
      }

      // Cannot move to a descendant (would create cycle)
      function isDescendant(nodeId: string, potentialDescendantId: string): boolean {
        const n = findNode(diagram, nodeId);
        if (!n?.children) return false;
        if (n.children.includes(potentialDescendantId)) return true;
        return n.children.some(c => isDescendant(c, potentialDescendantId));
      }

      if (isDescendant(id, options.to)) {
        error('Cannot move node to its own descendant (would create cycle)');
        process.exit(1);
      }

      // Cannot move root
      if (id === diagram.rootNodeId) {
        error('Cannot move root node');
        process.exit(1);
      }

      const oldParentId = node.parentId;

      if (oldParentId === options.to) {
        console.log('Node is already under this parent.');
        return;
      }

      if (options.dryRun) {
        console.log('Dry run - would move:');
        console.log(`  ${id}: ${oldParentId ?? '(root)'} → ${options.to}`);
        return;
      }

      // Remove from old parent's children
      if (oldParentId) {
        const oldParent = findNode(diagram, oldParentId);
        if (oldParent?.children) {
          oldParent.children = oldParent.children.filter(c => c !== id);
          if (oldParent.children.length === 0) {
            delete (oldParent as Record<string, unknown>).children;
          }
        }
      }

      // Add to new parent's children
      if (!newParent.children) {
        newParent.children = [];
      }
      newParent.children.push(id);

      // Update node's parentId
      node.parentId = options.to;

      // Save diagram
      saveDiagram(diagram);

      // Auto-layout both old and new parent subtrees
      if (oldParentId) {
        const oldPositions = autoLayoutSubtree(diagram.nodes, diagram.edges || [], oldParentId);
        applyPositions(diagram, oldPositions);
      }
      const newPositions = autoLayoutSubtree(diagram.nodes, diagram.edges || [], options.to);
      applyPositions(diagram, newPositions);

      success(`Moved node: ${id}`);
      console.log(`  ${oldParentId ?? '(root)'} → ${options.to}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
