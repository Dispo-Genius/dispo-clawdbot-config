import { Command } from 'commander';
import { loadDiagram, findNode, getDefaultDiagramId } from '../lib/loader';
import { formatNodes, error } from '../lib/output';
import type { Diagram, DiagramNode } from '../types';

/**
 * Trace upstream (find all nodes that lead to this one via edges)
 */
function traceUpstream(diagram: Diagram, nodeId: string): DiagramNode[] {
  const visited = new Set<string>();
  const result: DiagramNode[] = [];

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    // Find edges where target is this node
    const incomingEdges = diagram.edges?.filter(e => e.target === id) ?? [];

    for (const edge of incomingEdges) {
      const sourceNode = findNode(diagram, edge.source);
      if (sourceNode) {
        result.push(sourceNode);
        traverse(edge.source);
      }
    }
  }

  traverse(nodeId);
  return result;
}

/**
 * Trace downstream (find all nodes reachable from this one via edges)
 */
function traceDownstream(diagram: Diagram, nodeId: string): DiagramNode[] {
  const visited = new Set<string>();
  const result: DiagramNode[] = [];

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    // Find edges where source is this node
    const outgoingEdges = diagram.edges?.filter(e => e.source === id) ?? [];

    for (const edge of outgoingEdges) {
      const targetNode = findNode(diagram, edge.target);
      if (targetNode) {
        result.push(targetNode);
        traverse(edge.target);
      }
    }
  }

  traverse(nodeId);
  return result;
}

export const trace = new Command('trace')
  .description('Trace node connections via edges')
  .argument('<id>', 'Node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('--direction <dir>', 'Direction: upstream, downstream, or both', 'both')
  .action((id: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const node = findNode(diagram, id);

      if (!node) {
        error(`Node not found: ${id}`);
        process.exit(1);
      }

      if (!diagram.edges?.length) {
        console.log('No edges defined in this diagram.');
        return;
      }

      const direction = options.direction as 'upstream' | 'downstream' | 'both';

      if (direction === 'upstream' || direction === 'both') {
        const upstream = traceUpstream(diagram, id);
        console.log(`Upstream from ${id} (${upstream.length} nodes):`);
        if (upstream.length > 0) {
          console.log(formatNodes(upstream));
        } else {
          console.log('  (none)');
        }
      }

      if (direction === 'both') {
        console.log('');
      }

      if (direction === 'downstream' || direction === 'both') {
        const downstream = traceDownstream(diagram, id);
        console.log(`Downstream from ${id} (${downstream.length} nodes):`);
        if (downstream.length > 0) {
          console.log(formatNodes(downstream));
        } else {
          console.log('  (none)');
        }
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
