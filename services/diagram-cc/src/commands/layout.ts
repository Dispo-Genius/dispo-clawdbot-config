import { Command } from 'commander';
import { loadDiagram, saveDiagram, findNode, getDefaultDiagramId, getDiagramFolderPath } from '../lib/loader';
import { calculateLayout } from '../lib/layout';
import { success, error } from '../lib/output';
import type { Direction } from '../lib/layout';
import type { DiagramNode, DiagramEdge } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export const layout = new Command('layout')
  .description('Calculate and apply layout positions to diagram nodes')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-p, --parent <nodeId>', 'Layout only the subtree under this node')
  .option('-f, --file <path>', 'Layout a specific sub-diagram JSON file directly')
  .option('--all', 'Layout all nodes in the diagram')
  .option('--direction <dir>', 'Layout direction: TB (top-bottom) or LR (left-right)', 'TB')
  .option('--depth <n>', 'Max depth of children (default: 1 with --parent)')
  .option('--dry-run', 'Show positions without saving')
  .action((options) => {
    try {
      // Handle --file option for direct sub-diagram layout
      if (options.file) {
        layoutSubDiagramFile(options.file, options.direction || 'TB', options.dryRun);
        return;
      }

      if (!options.all && !options.parent) {
        error('Specify --all, --parent <nodeId>, or --file <path>');
        process.exit(1);
      }

      const direction = options.direction as Direction;
      if (direction !== 'TB' && direction !== 'LR') {
        error('Direction must be TB or LR');
        process.exit(1);
      }

      const diagram = loadDiagram(options.diagram);

      // Deduplicate nodes (folder-based diagrams can have parent nodes repeated in child files)
      const seenIds = new Set<string>();
      diagram.nodes = diagram.nodes.filter(n => {
        if (seenIds.has(n.id)) return false;
        seenIds.add(n.id);
        return true;
      });

      // Determine which nodes/edges to layout
      let layoutNodes: DiagramNode[];
      let layoutEdges: DiagramEdge[];

      if (options.parent) {
        // Collect subtree nodes
        const depth = options.depth ? parseInt(options.depth, 10) : 1;
        const subtreeIds = collectSubtreeIds(options.parent, diagram.nodes, diagram.edges || [], depth);
        if (subtreeIds.size === 0) {
          error(`Node ${options.parent} not found or has no subtree`);
          process.exit(1);
        }
        layoutNodes = diagram.nodes.filter(n => subtreeIds.has(n.id));
        layoutEdges = (diagram.edges || []).filter(e => subtreeIds.has(e.source) && subtreeIds.has(e.target));
      } else {
        layoutNodes = diagram.nodes;
        layoutEdges = diagram.edges || [];
      }

      // Run layout algorithm
      const result = calculateLayout({
        nodes: layoutNodes,
        edges: layoutEdges,
        direction,
      });

      // Apply positions to diagram nodes
      let updated = 0;
      for (const node of diagram.nodes) {
        const pos = result.positions.get(node.id);
        if (pos) {
          node.position = pos;
          updated++;
        }
      }

      if (options.dryRun) {
        console.log(`Would update ${updated} node positions:`);
        for (const [id, pos] of result.positions) {
          console.log(`  ${id}: (${pos.x}, ${pos.y})`);
        }
        console.log(`Canvas: ${result.width}x${result.height}`);
        return;
      }

      // Save — handle folder-based diagrams by writing positions into node files
      const folderPath = getDiagramFolderPath(options.diagram);
      if (folderPath) {
        // Folder-based: update positions in individual node files
        updateFolderDiagramPositions(folderPath, diagram, result.positions);
      } else {
        // Single-file: save entire diagram
        saveDiagram(diagram);
      }

      success(`Layout applied to ${updated} nodes (${result.width}x${result.height})`);

      // Verify no overlaps
      const overlaps = checkOverlaps(result.positions, layoutNodes);
      if (overlaps.length > 0) {
        console.log(`\nWarning: ${overlaps.length} overlap(s) detected:`);
        for (const [a, b] of overlaps) {
          console.log(`  ${a} overlaps ${b}`);
        }
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

/**
 * Collect all node IDs in a subtree using parentId hierarchy
 * Returns nodes with the given parentId (direct children of root)
 */
function collectSubtreeIds(
  rootId: string,
  nodes: DiagramNode[],
  _edges: DiagramEdge[],
  maxDepth: number = Infinity
): Set<string> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  if (!nodeMap.has(rootId)) return new Set();

  // Build parent -> children map using parentId field
  const childrenOfParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      const siblings = childrenOfParent.get(node.parentId) || [];
      siblings.push(node.id);
      childrenOfParent.set(node.parentId, siblings);
    }
  }

  // BFS to collect descendants via parentId, respecting depth limit
  const ids = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (ids.has(id)) continue;
    ids.add(id);
    // Add children only if within depth limit
    if (depth < maxDepth) {
      for (const child of childrenOfParent.get(id) || []) {
        queue.push({ id: child, depth: depth + 1 });
      }
    }
  }

  return ids;
}

/**
 * Check for overlapping nodes within same layer (y-bucket).
 * Groups nodes by y-coordinate to avoid O(n^2) full comparison.
 */
function checkOverlaps(
  positions: Map<string, { x: number; y: number }>,
  nodes: DiagramNode[]
): [string, string][] {
  const overlaps: [string, string][] = [];
  const nodeList = nodes.filter(n => positions.has(n.id));

  // Group by y-coordinate (same layer = same y)
  const byY = new Map<number, typeof nodeList>();
  for (const node of nodeList) {
    const pos = positions.get(node.id)!;
    const bucket = Math.round(pos.y / 20) * 20; // snap to grid
    if (!byY.has(bucket)) byY.set(bucket, []);
    byY.get(bucket)!.push(node);
  }

  // Only check within same y-bucket
  for (const [, group] of byY) {
    group.sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x);
    for (let i = 0; i < group.length - 1; i++) {
      const a = group[i];
      const b = group[i + 1];
      const posA = positions.get(a.id)!;
      const posB = positions.get(b.id)!;
      const dimA = getDims(a.type);

      if (posA.x + dimA.width > posB.x) {
        overlaps.push([a.id, b.id]);
      }
    }
  }

  return overlaps;
}

function getDims(type: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
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
  return dims[type] || dims.flow;
}

/**
 * Update positions in folder-based diagram (writes to individual node files)
 */
function updateFolderDiagramPositions(
  folderPath: string,
  diagram: { nodes: DiagramNode[]; edges?: DiagramEdge[]; [key: string]: unknown },
  positions: Map<string, { x: number; y: number }>
): void {
  // Read the folder index to get nodeFiles list
  const indexPath = path.join(folderPath, 'index.json');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const indexData = JSON.parse(indexContent);

  // Update positions in root index nodes
  let indexModified = false;
  if (indexData.nodes) {
    for (const node of indexData.nodes) {
      const pos = positions.get(node.id);
      if (pos) {
        node.position = pos;
        indexModified = true;
      }
    }
  }

  if (indexModified) {
    indexData.lastUpdated = new Date().toISOString().split('T')[0];
    const tempPath = `${indexPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(indexData, null, 2) + '\n', 'utf-8');
    fs.renameSync(tempPath, indexPath);
  }

  // Update positions in each node file
  if (indexData.nodeFiles) {
    for (const nodeFile of indexData.nodeFiles) {
      const nodeFilePath = path.join(folderPath, nodeFile);
      try {
        const content = fs.readFileSync(nodeFilePath, 'utf-8');
        const nodeData = JSON.parse(content);
        let modified = false;

        // Update top-level node position
        if (nodeData.id && positions.has(nodeData.id)) {
          nodeData.position = positions.get(nodeData.id);
          modified = true;
        }

        // Update nested nodes
        if (nodeData.nodes) {
          for (const node of nodeData.nodes) {
            const pos = positions.get(node.id);
            if (pos) {
              node.position = pos;
              modified = true;
            }
          }
        }

        if (modified) {
          const tempPath = `${nodeFilePath}.tmp`;
          fs.writeFileSync(tempPath, JSON.stringify(nodeData, null, 2) + '\n', 'utf-8');
          fs.renameSync(tempPath, nodeFilePath);
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }
}

/**
 * Layout a sub-diagram file directly (for files not in main tree)
 */
function layoutSubDiagramFile(filePath: string, direction: Direction, dryRun?: boolean): void {
  if (!fs.existsSync(filePath)) {
    error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (!data.nodes || !Array.isArray(data.nodes)) {
    error('File does not contain a nodes array');
    process.exit(1);
  }

  // Run layout algorithm
  const result = calculateLayout({
    nodes: data.nodes,
    edges: data.edges || [],
    direction,
  });

  // Apply positions
  let updated = 0;
  for (const node of data.nodes) {
    const pos = result.positions.get(node.id);
    if (pos) {
      node.position = pos;
      updated++;
    }
  }

  if (dryRun) {
    console.log(`Would update ${updated} node positions:`);
    for (const [id, pos] of result.positions) {
      console.log(`  ${id}: (${pos.x}, ${pos.y})`);
    }
    console.log(`Canvas: ${result.width}x${result.height}`);
    return;
  }

  // Write back to file
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);

  success(`Layout applied to ${updated} nodes (${result.width}x${result.height})`);

  // Verify no overlaps
  const overlaps = checkOverlaps(result.positions, data.nodes);
  if (overlaps.length > 0) {
    console.log(`\nWarning: ${overlaps.length} overlap(s) detected:`);
    for (const [a, b] of overlaps) {
      console.log(`  ${a} overlaps ${b}`);
    }
  }
}
