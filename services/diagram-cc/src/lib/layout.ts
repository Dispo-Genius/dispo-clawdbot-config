/**
 * Grid-based hierarchical layout algorithm for diagram-cc
 *
 * Strict grid system with rules:
 * 1. Grid intercepts only - x % CELL_WIDTH === 0, y % CELL_HEIGHT === 0
 * 2. Midpoint anchor - single nodes at x=0
 * 3. Vertical alignment - single-child chains form straight vertical lines
 * 4. Integer grid expansion - multiple nodes spread symmetrically on grid
 * 5. Push on conflict - left nodes keep position, conflicts push right
 * 6. Hierarchical independence - each parent's children laid out independently
 */

import type { NodeType, Position, DiagramNode, DiagramEdge } from '../types';

export type Direction = 'TB' | 'LR';

export interface LayoutInput {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction?: Direction;
}

export interface LayoutResult {
  positions: Map<string, Position>;
  width: number;
  height: number;
}

// --- Constants ---

const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  system: { width: 280, height: 120 },
  subsystem: { width: 240, height: 110 },
  flow: { width: 200, height: 100 },
  component: { width: 180, height: 90 },
  external: { width: 160, height: 90 },
  trigger: { width: 180, height: 90 },
  process: { width: 200, height: 90 },
  decision: { width: 200, height: 90 },
  database: { width: 180, height: 90 },
  'api-call': { width: 200, height: 90 },
  transform: { width: 200, height: 90 },
  'ai-agent': { width: 200, height: 90 },
  queue: { width: 180, height: 90 },
  goto: { width: 140, height: 60 },
};

const CELL_WIDTH = 300;  // Minimum: max node width (280) + 20px gap
const CELL_HEIGHT = 200;
const SECONDARY_LABELS = ['not found', 'no', 'false', 'invalid', 'error', 'fail', 'skip'];

export function getNodeDimensions(type: NodeType): { width: number; height: number } {
  return NODE_DIMENSIONS[type] || NODE_DIMENSIONS.flow;
}

/**
 * Snap position to grid intercepts (multiples of CELL_WIDTH/CELL_HEIGHT)
 */
function snapToGridIntercept(pos: Position): Position {
  return {
    x: Math.round(pos.x / CELL_WIDTH) * CELL_WIDTH,
    y: Math.round(pos.y / CELL_HEIGHT) * CELL_HEIGHT,
  };
}

/**
 * Main layout function - implements strict grid-based algorithm
 */
export function calculateLayout(input: LayoutInput): LayoutResult {
  const { nodes, edges, direction = 'TB' } = input;

  if (nodes.length === 0) {
    return { positions: new Map(), width: 0, height: 0 };
  }

  // Build adjacency maps
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const edgeLabels = new Map<string, string>();

  for (const edge of edges) {
    childrenOf.set(edge.source, [...(childrenOf.get(edge.source) || []), edge.target]);
    parentsOf.set(edge.target, [...(parentsOf.get(edge.target) || []), edge.source]);
    if (edge.label) {
      edgeLabels.set(`${edge.source}->${edge.target}`, edge.label);
    }
  }

  const nodeTypes = new Map(nodes.map(n => [n.id, n.type]));
  const nodeSet = new Set(nodes.map(n => n.id));

  // Sort decision/database children: primary left, secondary right
  for (const [parentId, children] of childrenOf) {
    const parentType = nodeTypes.get(parentId);
    if (parentType === 'decision' || parentType === 'database') {
      children.sort((a, b) => {
        const labelA = edgeLabels.get(`${parentId}->${a}`)?.toLowerCase() || '';
        const labelB = edgeLabels.get(`${parentId}->${b}`)?.toLowerCase() || '';
        const aIsSecondary = SECONDARY_LABELS.some(s => labelA.includes(s));
        const bIsSecondary = SECONDARY_LABELS.some(s => labelB.includes(s));
        if (aIsSecondary && !bIsSecondary) return 1;
        if (!aIsSecondary && bIsSecondary) return -1;
        return 0;
      });
      childrenOf.set(parentId, children);
    }
  }

  // Find root nodes (no incoming edges from nodes in this set)
  const roots = nodes.filter(n => {
    const parents = parentsOf.get(n.id) || [];
    return parents.filter(p => nodeSet.has(p)).length === 0;
  });

  // --- Phase 1: Assign layers via BFS (max-layer for multi-parent) ---
  const nodeLayer = new Map<string, number>();
  const queue = roots.map(r => ({ id: r.id, layer: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;

    const existingLayer = nodeLayer.get(id);
    if (existingLayer !== undefined && existingLayer >= layer) {
      continue;
    }

    nodeLayer.set(id, layer);

    if (!visited.has(id)) {
      visited.add(id);
      for (const childId of childrenOf.get(id) || []) {
        if (nodeSet.has(childId)) {
          queue.push({ id: childId, layer: layer + 1 });
        }
      }
    }
  }

  // Build layers array
  const layers: string[][] = [];
  for (const [id, layer] of nodeLayer) {
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(id);
  }

  // Handle disconnected nodes
  for (const node of nodes) {
    if (!nodeLayer.has(node.id)) {
      nodeLayer.set(node.id, 0);
      if (!layers[0]) layers[0] = [];
      layers[0].push(node.id);
    }
  }

  // Sort nodes within each layer by ID for deterministic output
  for (const layer of layers) {
    if (layer) {
      layer.sort((a, b) => a.localeCompare(b));
    }
  }

  // --- Phase 2: Grid-based positioning (using CENTER positions) ---
  // We store center X positions throughout Phases 2-4, and only convert to
  // left-edge positions at the end of Phase 5. This prevents 20px drift when
  // nodes of different widths are snapped to the 20px grid.
  const centerPositions = new Map<string, Position>();
  const nodeDims = new Map(nodes.map(n => [n.id, NODE_DIMENSIONS[n.type] || NODE_DIMENSIONS.flow]));

  // Track column assignments per layer (grid column index, not pixels)
  const nodeGridCol = new Map<string, number>();

  // Process layers top-down
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const nodesInLayer = layers[layerIdx];
    if (!nodesInLayer || nodesInLayer.length === 0) continue;

    const y = layerIdx * CELL_HEIGHT;

    if (nodesInLayer.length === 1) {
      // Single node: center at x=0 (midpoint anchor)
      const nodeId = nodesInLayer[0];
      nodeGridCol.set(nodeId, 0);
      centerPositions.set(nodeId, {
        x: 0,  // Center position, not left edge
        y,
      });
    } else {
      // Multiple nodes: order by parent position, then spread on grid
      const orderedNodes = orderNodesByParentPosition(
        nodesInLayer,
        parentsOf,
        nodeGridCol,
        edgeLabels
      );

      // Center N nodes around midpoint using integer grid positions
      // For N nodes: positions are at -(N-1)/2, ..., 0, ..., (N-1)/2 grid units
      // For even N, we skip 0 and use -N/2+0.5, ..., N/2-0.5 → round to integers
      const n = orderedNodes.length;
      const startCol = -Math.floor((n - 1) / 2);

      for (let i = 0; i < orderedNodes.length; i++) {
        const nodeId = orderedNodes[i];
        const col = startCol + i;
        nodeGridCol.set(nodeId, col);
        centerPositions.set(nodeId, {
          x: col * CELL_WIDTH,  // Center position, not left edge
          y,
        });
      }
    }
  }

  // --- Phase 3: Parent-centered child positioning ---
  // For decision/database nodes with multiple children, spread them symmetrically around parent
  // For single-child nodes, align child directly below parent
  // Process all nodes (not just by layer) to handle children at different depths
  for (const nodeId of nodes.map(n => n.id)) {
    const parentType = nodeTypes.get(nodeId);
    const children = (childrenOf.get(nodeId) || []).filter(c => nodeSet.has(c));
    const parentCol = nodeGridCol.get(nodeId);
    const parentLayer = nodeLayer.get(nodeId);
    if (parentCol === undefined || parentLayer === undefined) continue;

    // For single-child relationships where child has only one parent
    if (children.length === 1) {
      const childId = children[0];
      const childParents = (parentsOf.get(childId) || []).filter(p => nodeSet.has(p));
      if (childParents.length === 1) {
        const childLayer = nodeLayer.get(childId);
        if (childLayer !== undefined) {
          nodeGridCol.set(childId, parentCol);
          centerPositions.set(childId, {
            x: parentCol * CELL_WIDTH,
            y: childLayer * CELL_HEIGHT,
          });
        }
      }
    }

    // For decision/database nodes with multiple children
    if (children.length >= 2 && (parentType === 'decision' || parentType === 'database')) {
      // Only spread children that have THIS node as their ONLY parent
      // (shared children can't be positioned symmetrically around multiple parents)
      const exclusiveChildren = children.filter(c => {
        const childParents = (parentsOf.get(c) || []).filter(p => nodeSet.has(p));
        return childParents.length === 1 && childParents[0] === nodeId;
      });

      if (exclusiveChildren.length >= 2) {
        // Sort: primary (yes/found/true) left, secondary (no/not found/false) right
        exclusiveChildren.sort((a, b) => {
          const labelA = edgeLabels.get(`${nodeId}->${a}`)?.toLowerCase() || '';
          const labelB = edgeLabels.get(`${nodeId}->${b}`)?.toLowerCase() || '';
          const aIsSecondary = SECONDARY_LABELS.some(s => labelA.includes(s));
          const bIsSecondary = SECONDARY_LABELS.some(s => labelB.includes(s));
          if (aIsSecondary && !bIsSecondary) return 1;
          if (!aIsSecondary && bIsSecondary) return -1;
          return a.localeCompare(b);
        });

        // Position symmetrically around parent column
        // For even n: skip center (e.g., 2 children → -1, +1)
        // For odd n: include center (e.g., 3 children → -1, 0, +1)
        const n = exclusiveChildren.length;
        const offsets: number[] = [];
        if (n % 2 === 1) {
          for (let i = -Math.floor(n / 2); i <= Math.floor(n / 2); i++) {
            offsets.push(i);
          }
        } else {
          for (let i = -n / 2; i <= n / 2; i++) {
            if (i !== 0) offsets.push(i);
          }
        }

        for (let i = 0; i < n; i++) {
          const childId = exclusiveChildren[i];
          const childLayer = nodeLayer.get(childId);
          if (childLayer === undefined) continue;
          const childCol = parentCol + offsets[i];
          nodeGridCol.set(childId, childCol);
          centerPositions.set(childId, {
            x: childCol * CELL_WIDTH,
            y: childLayer * CELL_HEIGHT,
          });
        }
      }
    }
  }

  // --- Phase 4: Resolve overlaps with push-right ---
  for (const layer of layers) {
    if (!layer || layer.length === 0) continue;
    // Sort by current column
    layer.sort((a, b) => (nodeGridCol.get(a) || 0) - (nodeGridCol.get(b) || 0));

    for (let i = 1; i < layer.length; i++) {
      const prevCol = nodeGridCol.get(layer[i - 1])!;
      const currCol = nodeGridCol.get(layer[i])!;

      if (currCol <= prevCol) {
        // Push right to next available column
        const newCol = prevCol + 1;
        nodeGridCol.set(layer[i], newCol);
        const layerY = nodeLayer.get(layer[i])! * CELL_HEIGHT;
        centerPositions.set(layer[i], {
          x: newCol * CELL_WIDTH,  // Center position, not left edge
          y: layerY,
        });
      }
    }
  }

  // --- Phase 5: Apply direction, normalize, and convert to left-edge positions ---
  if (direction === 'LR') {
    for (const [id, pos] of centerPositions) {
      centerPositions.set(id, { x: pos.y, y: pos.x });
    }
  }

  // Find min center X for normalization (we need to account for node width)
  let minCenterX = Infinity;
  for (const [id, pos] of centerPositions) {
    const dims = nodeDims.get(id)!;
    minCenterX = Math.min(minCenterX, pos.x - dims.width / 2);
  }

  // Offset so left-most node edge starts at 20px padding
  const offsetX = minCenterX < 20 ? 20 - minCenterX : 0;
  const offsetY = 20;

  // Convert center positions to left-edge positions AFTER snapping centers
  const positions = new Map<string, Position>();
  for (const [id, pos] of centerPositions) {
    const dims = nodeDims.get(id)!;
    // Snap the CENTER position to 20px grid, then offset by half width
    const snappedCenterX = Math.round((pos.x + offsetX) / 20) * 20;
    const snappedY = Math.round((pos.y + offsetY) / 20) * 20;
    positions.set(id, {
      x: snappedCenterX - dims.width / 2,
      y: snappedY,
    });
  }

  // Compute bounds
  let maxX = -Infinity;
  let maxY = 0;
  for (const [id, pos] of positions) {
    const dims = nodeDims.get(id)!;
    maxX = Math.max(maxX, pos.x + dims.width);
    maxY = Math.max(maxY, pos.y + dims.height);
  }

  return {
    positions,
    width: maxX + 40,
    height: maxY + 40,
  };
}

/**
 * Order nodes by their parents' grid positions (for barycenter-like ordering)
 */
function orderNodesByParentPosition(
  nodesInLayer: string[],
  parentsOf: Map<string, string[]>,
  nodeGridCol: Map<string, number>,
  edgeLabels: Map<string, string>
): string[] {
  const scored = nodesInLayer.map(nodeId => {
    const parents = parentsOf.get(nodeId) || [];
    const parentCols = parents
      .map(p => nodeGridCol.get(p))
      .filter((c): c is number => c !== undefined);

    let score: number;
    if (parentCols.length === 0) {
      score = 0;
    } else {
      score = parentCols.reduce((a, b) => a + b, 0) / parentCols.length;
    }

    // Secondary sort: check if incoming edge has a "secondary" label (push right)
    let isSecondary = false;
    for (const parent of parents) {
      const label = edgeLabels.get(`${parent}->${nodeId}`)?.toLowerCase() || '';
      if (SECONDARY_LABELS.some(s => label.includes(s))) {
        isSecondary = true;
        break;
      }
    }

    return { nodeId, score, isSecondary };
  });

  // Sort by score, then by secondary status, then by ID
  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.isSecondary !== b.isSecondary) return a.isSecondary ? 1 : -1;
    return a.nodeId.localeCompare(b.nodeId);
  });

  return scored.map(s => s.nodeId);
}

/**
 * Auto-layout a parent's subtree after structural changes.
 * Called automatically by create/connect/delete/move commands.
 */
export function autoLayoutSubtree(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  parentId: string
): Map<string, Position> {
  // Collect nodes in the parent's subtree (parentId field, not edges)
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childrenOfParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenOfParent.get(node.parentId) || [];
      siblings.push(node.id);
      childrenOfParent.set(node.parentId, siblings);
    }
  }

  // BFS to collect subtree
  const subtreeIds = new Set<string>();
  const queue = [parentId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (subtreeIds.has(id)) continue;
    subtreeIds.add(id);
    for (const child of childrenOfParent.get(id) || []) {
      queue.push(child);
    }
  }

  // Filter to subtree
  const subtreeNodes = nodes.filter(n => subtreeIds.has(n.id));
  const subtreeEdges = edges.filter(e => subtreeIds.has(e.source) && subtreeIds.has(e.target));

  // Run layout
  const result = calculateLayout({ nodes: subtreeNodes, edges: subtreeEdges });
  return result.positions;
}
