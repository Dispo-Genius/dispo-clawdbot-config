/**
 * Custom grid layout calculation for system diagrams
 *
 * Provides hierarchical auto-layout for nodes using a custom grid algorithm
 * optimized for data flow diagrams with proper parent centering.
 *
 * Features:
 * - Parallel branch detection: spreads children symmetrically around parent
 * - Sibling ordering: uses barycenter heuristic to minimize edge crossings
 * - Decision node handling: places primary paths left, secondary right
 */

import type { NodeType, Position, LayoutInput, LayoutResult } from './types';
import { NODE_DIMENSIONS, GRID_SIZE, CELL_WIDTH, CELL_HEIGHT, SECONDARY_LABELS } from './constants';

/** Snap a position to the grid */
export function snapToGrid(position: Position): Position {
  return {
    x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
  };
}

/**
 * Get node dimensions for a given type
 */
export function getNodeDimensions(type: NodeType): { width: number; height: number } {
  return NODE_DIMENSIONS[type] || NODE_DIMENSIONS.flow;
}

/**
 * Calculate hierarchical layout positions for diagram nodes
 *
 * Uses a custom grid algorithm that:
 * 1. Assigns layers via BFS with maximum layer assignment for multi-parent nodes
 * 2. Orders siblings using barycenter heuristic to minimize edge crossings
 * 3. Handles decision nodes by placing primary paths left, secondary right
 * 4. Positions leaves first, then centers parents over children
 *
 * @param input - Nodes and edges to layout
 * @returns Map of node IDs to calculated positions
 */
export async function calculateLayout(input: LayoutInput): Promise<LayoutResult> {
  const { nodes, edges } = input;

  if (nodes.length === 0) {
    return { positions: new Map(), width: 0, height: 0 };
  }

  // Build adjacency maps and track edge labels
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const edgeLabels = new Map<string, string>(); // "source->target" -> label

  for (const edge of edges) {
    childrenOf.set(edge.source, [...(childrenOf.get(edge.source) || []), edge.target]);
    parentsOf.set(edge.target, [...(parentsOf.get(edge.target) || []), edge.source]);
    if (edge.label) {
      edgeLabels.set(`${edge.source}->${edge.target}`, edge.label);
    }
  }

  // Build node type lookup
  const nodeTypes = new Map(nodes.map(n => [n.id, n.type]));

  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => !parentsOf.has(n.id) || parentsOf.get(n.id)!.length === 0);

  // Assign layers via BFS - use maximum layer for nodes with multiple parents
  const nodeLayer = new Map<string, number>();
  const queue = roots.map(r => ({ id: r.id, layer: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;

    // For nodes with multiple parents, use the maximum layer
    const existingLayer = nodeLayer.get(id);
    if (existingLayer !== undefined && existingLayer >= layer) {
      continue;
    }

    nodeLayer.set(id, layer);

    if (!visited.has(id)) {
      visited.add(id);
      for (const childId of childrenOf.get(id) || []) {
        queue.push({ id: childId, layer: layer + 1 });
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

  // Sort children of decision/database nodes: primary paths left, secondary right
  for (const [parentId, children] of childrenOf) {
    const parentType = nodeTypes.get(parentId);
    if (parentType === 'decision' || parentType === 'database') {
      children.sort((a, b) => {
        const labelA = edgeLabels.get(`${parentId}->${a}`)?.toLowerCase() || '';
        const labelB = edgeLabels.get(`${parentId}->${b}`)?.toLowerCase() || '';
        const aIsSecondary = SECONDARY_LABELS.some(s => labelA.includes(s));
        const bIsSecondary = SECONDARY_LABELS.some(s => labelB.includes(s));
        if (aIsSecondary && !bIsSecondary) return 1; // a goes right
        if (!aIsSecondary && bIsSecondary) return -1; // b goes right
        return 0;
      });
      childrenOf.set(parentId, children);
    }
  }

  // Barycenter ordering: order nodes in each layer to minimize crossings
  // Run multiple passes top-down and bottom-up
  const nodeCenter = new Map<string, number>();

  // Initial positioning: assign indices
  for (const layer of layers) {
    layer.forEach((id, i) => nodeCenter.set(id, i * CELL_WIDTH + CELL_WIDTH / 2));
  }

  // Barycenter passes (2 iterations of down-up)
  for (let pass = 0; pass < 2; pass++) {
    // Top-down pass: order by average position of parents
    for (let layerIdx = 1; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      const barycenters = layer.map(nodeId => {
        const parents = parentsOf.get(nodeId) || [];
        if (parents.length === 0) return nodeCenter.get(nodeId) || 0;
        const sum = parents.reduce((acc, p) => acc + (nodeCenter.get(p) || 0), 0);
        return sum / parents.length;
      });

      // Sort by barycenter - only update order, not positions
      const indexed = layer.map((id, i) => ({ id, bc: barycenters[i] }));
      indexed.sort((a, b) => a.bc - b.bc);
      layers[layerIdx] = indexed.map(x => x.id);
    }

    // Bottom-up pass: order by average position of children
    for (let layerIdx = layers.length - 2; layerIdx >= 0; layerIdx--) {
      const layer = layers[layerIdx];
      const barycenters = layer.map(nodeId => {
        const children = childrenOf.get(nodeId) || [];
        if (children.length === 0) return nodeCenter.get(nodeId) || 0;
        const sum = children.reduce((acc, c) => acc + (nodeCenter.get(c) || 0), 0);
        return sum / children.length;
      });

      // Sort by barycenter - only update order, not positions
      const indexed = layer.map((id, i) => ({ id, bc: barycenters[i] }));
      indexed.sort((a, b) => a.bc - b.bc);
      layers[layerIdx] = indexed.map(x => x.id);
    }
  }

  // Final positioning pass bottom-up: center parents over children
  const positions = new Map<string, Position>();
  const nodeDims = new Map(nodes.map(n => [n.id, NODE_DIMENSIONS[n.type] || NODE_DIMENSIONS.flow]));

  for (let layer = layers.length - 1; layer >= 0; layer--) {
    const nodesInLayer = layers[layer];
    const centersInLayer: number[] = [];

    for (let i = 0; i < nodesInLayer.length; i++) {
      const nodeId = nodesInLayer[i];
      const children = childrenOf.get(nodeId) || [];
      let centerX: number;

      if (children.length > 0 && children.some(c => nodeCenter.has(c))) {
        // Center over children, spreading parallel branches symmetrically
        const childCenters = children
          .map(c => nodeCenter.get(c)!)
          .filter(c => c !== undefined)
          .sort((a, b) => a - b);

        if (childCenters.length === 1) {
          // Single child: align directly
          centerX = childCenters[0];
        } else {
          // Multiple children: center between leftmost and rightmost
          centerX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
        }
      } else {
        // Leaf or disconnected: position based on barycenter ordering
        centerX = nodeCenter.get(nodeId) || (i * CELL_WIDTH + CELL_WIDTH / 2);
      }

      // Avoid overlap with previous siblings in this layer
      if (centersInLayer.length > 0) {
        const lastCenter = centersInLayer[centersInLayer.length - 1];
        const minGap = CELL_WIDTH;
        if (centerX < lastCenter + minGap) {
          centerX = lastCenter + minGap;
        }
      }

      centersInLayer.push(centerX);
      nodeCenter.set(nodeId, centerX);

      const dims = nodeDims.get(nodeId)!;
      positions.set(nodeId, snapToGrid({
        x: centerX - dims.width / 2,
        y: layer * CELL_HEIGHT,
      }));
    }
  }

  // Second pass: Re-center nodes with multiple parents
  for (let layer = 1; layer < layers.length; layer++) {
    for (const nodeId of layers[layer]) {
      const parents = parentsOf.get(nodeId) || [];
      if (parents.length > 1) {
        const parentCenters = parents
          .map(p => nodeCenter.get(p))
          .filter((c): c is number => c !== undefined);
        if (parentCenters.length > 1) {
          const newCenter = (Math.min(...parentCenters) + Math.max(...parentCenters)) / 2;
          nodeCenter.set(nodeId, newCenter);
          const dims = nodeDims.get(nodeId)!;
          const currentPos = positions.get(nodeId)!;
          positions.set(nodeId, snapToGrid({
            x: newCenter - dims.width / 2,
            y: currentPos.y,
          }));
        }
      }
    }
  }

  // Normalize to avoid negative coordinates
  let minX = Infinity,
    maxX = -Infinity,
    maxY = 0;
  for (const [id, pos] of positions) {
    const dims = nodeDims.get(id)!;
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x + dims.width);
    maxY = Math.max(maxY, pos.y + dims.height);
  }

  const offsetX = minX < 20 ? 20 - minX : 0;
  const offsetY = 20;
  for (const [id, pos] of positions) {
    positions.set(id, snapToGrid({ x: pos.x + offsetX, y: pos.y + offsetY }));
  }

  return {
    positions,
    width: maxX - minX + offsetX + 40,
    height: maxY + offsetY + 40,
  };
}
