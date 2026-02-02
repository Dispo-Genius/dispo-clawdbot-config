import * as fs from 'fs';
import * as path from 'path';
import type { Diagram, DiagramIndex, DiagramNode, DiagramEdge } from '../types';

// Base path for diagram data - relative to dg-prototype
const PROJECT_ROOT = '/Users/andyrong/dg-prototype';
const DIAGRAMS_DIR = path.join(PROJECT_ROOT, 'public/data/diagrams');
const INDEX_FILE = path.join(DIAGRAMS_DIR, 'index.json');

/**
 * Load the diagram index
 */
export function loadIndex(): DiagramIndex {
  const content = fs.readFileSync(INDEX_FILE, 'utf-8');
  return JSON.parse(content) as DiagramIndex;
}

interface FolderIndex extends Diagram {
  nodeFiles?: string[];
}

/**
 * Get the base path for a diagram by ID
 * Returns the folder path for folder-based diagrams, or file path for single-file diagrams
 */
export function getDiagramPath(diagramId: string): string {
  const index = loadIndex();
  const entry = index.diagrams.find(d => d.id === diagramId);

  if (!entry) {
    throw new Error(`Diagram not found: ${diagramId}`);
  }

  const isFolder = entry.file.endsWith('/');
  if (isFolder) {
    // Return path to index.json in the folder
    return path.join(DIAGRAMS_DIR, entry.file.slice(0, -1), 'index.json');
  }

  return path.join(DIAGRAMS_DIR, entry.file);
}

/**
 * Get the base folder path for a diagram (for folder-based diagrams)
 */
export function getDiagramFolderPath(diagramId: string): string | null {
  const index = loadIndex();
  const entry = index.diagrams.find(d => d.id === diagramId);
  if (!entry || !entry.file.endsWith('/')) return null;
  return path.join(DIAGRAMS_DIR, entry.file.slice(0, -1));
}

/**
 * Load a diagram by ID (supports both single-file and folder-based diagrams)
 */
export function loadDiagram(diagramId: string): Diagram {
  const filePath = getDiagramPath(diagramId);
  const content = fs.readFileSync(filePath, 'utf-8');
  const indexData: FolderIndex = JSON.parse(content);

  // If no nodeFiles, it's a single-file diagram
  if (!indexData.nodeFiles || indexData.nodeFiles.length === 0) {
    return indexData;
  }

  // Folder-based diagram: load and merge all node files with deduplication
  const folderPath = getDiagramFolderPath(diagramId);
  if (!folderPath) return indexData;

  // Use Maps for deduplication by ID (later files override earlier)
  // Edge key is source->target since edges don't have IDs
  const nodeMap = new Map<string, DiagramNode>();
  const edgeMap = new Map<string, DiagramEdge>();
  const edgeKey = (e: DiagramEdge) => `${e.source}->${e.target}`;

  // Add nodes/edges from main index
  for (const node of (indexData.nodes || [])) nodeMap.set(node.id, node);
  for (const edge of (indexData.edges || [])) edgeMap.set(edgeKey(edge), edge);

  // Merge from nodeFiles (later wins)
  for (const nodeFile of indexData.nodeFiles) {
    const nodeFilePath = path.join(folderPath, nodeFile);
    try {
      const nodeContent = fs.readFileSync(nodeFilePath, 'utf-8');
      const nodeData = JSON.parse(nodeContent);
      if (nodeData.nodes) {
        for (const node of nodeData.nodes) nodeMap.set(node.id, node);
      }
      if (nodeData.edges) {
        for (const edge of nodeData.edges) edgeMap.set(edgeKey(edge), edge);
      }
    } catch (err) {
      console.warn(`Failed to load node file ${nodeFile}: ${err}`);
    }
  }

  return {
    ...indexData,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/**
 * Atomic write helper
 */
function atomicWrite(filePath: string, data: unknown): void {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Build a map of parentId → nodeFile path for folder-based diagrams
 */
function buildParentToFileMap(nodeFiles: string[], folderPath: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const nodeFile of nodeFiles) {
    const nodeFilePath = path.join(folderPath, nodeFile);
    try {
      const content = fs.readFileSync(nodeFilePath, 'utf-8');
      const data = JSON.parse(content);
      // The nodeFile's `id` field indicates which parentId it owns
      if (data.id) {
        map.set(data.id, nodeFilePath);
      }
    } catch {
      // Skip unreadable files
    }
  }
  return map;
}

/**
 * Save a diagram (atomic write with temp file)
 * For folder-based diagrams, routes nodes to their correct files based on parentId
 */
export function saveDiagram(diagram: Diagram): void {
  const indexPath = getDiagramPath(diagram.id);
  const folderPath = getDiagramFolderPath(diagram.id);

  // Update lastUpdated
  diagram.lastUpdated = new Date().toISOString().split('T')[0];

  // Single-file diagram: write everything to one file
  if (!folderPath) {
    atomicWrite(indexPath, diagram);
    updateIndexLastUpdated(diagram.id);
    return;
  }

  // Folder-based diagram: route nodes to their respective files
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const indexData: FolderIndex = JSON.parse(indexContent);

  if (!indexData.nodeFiles || indexData.nodeFiles.length === 0) {
    atomicWrite(indexPath, diagram);
    updateIndexLastUpdated(diagram.id);
    return;
  }

  // Build map: parentId → nodeFile path
  const parentToFile = buildParentToFileMap(indexData.nodeFiles, folderPath);

  // Group nodes by destination file
  type NodeFile = { id: string; nodes: DiagramNode[]; edges: DiagramEdge[]; [key: string]: unknown };
  const fileContents = new Map<string, NodeFile>();

  // Initialize file contents from existing files (preserve metadata)
  for (const nodeFile of indexData.nodeFiles) {
    const nodeFilePath = path.join(folderPath, nodeFile);
    try {
      const content = fs.readFileSync(nodeFilePath, 'utf-8');
      const data = JSON.parse(content);
      fileContents.set(nodeFilePath, { ...data, nodes: [], edges: [] });
    } catch {
      // Skip
    }
  }

  // Root nodes go to main index (nodes without parentId or with parentId not in any nodeFile)
  const rootNodes: DiagramNode[] = [];
  const rootEdges: DiagramEdge[] = [];
  const nodeToFile = new Map<string, string>(); // Track where each node ends up

  for (const node of diagram.nodes) {
    const destFile = node.parentId ? parentToFile.get(node.parentId) : null;
    if (destFile && fileContents.has(destFile)) {
      fileContents.get(destFile)!.nodes.push(node);
      nodeToFile.set(node.id, destFile);
    } else {
      rootNodes.push(node);
      nodeToFile.set(node.id, indexPath);
    }
  }

  // Route edges: edge goes with its source node's file
  for (const edge of (diagram.edges || [])) {
    const sourceFile = nodeToFile.get(edge.source);
    if (sourceFile && sourceFile !== indexPath && fileContents.has(sourceFile)) {
      fileContents.get(sourceFile)!.edges.push(edge);
    } else {
      rootEdges.push(edge);
    }
  }

  // Write each nodeFile
  for (const [filePath, content] of fileContents) {
    atomicWrite(filePath, content);
  }

  // Write main index (metadata + root nodes only)
  const mainIndex: FolderIndex = {
    ...indexData,
    lastUpdated: diagram.lastUpdated,
    nodes: rootNodes,
    edges: rootEdges,
  };
  atomicWrite(indexPath, mainIndex);

  updateIndexLastUpdated(diagram.id);
}

/**
 * Update the lastUpdated field in the index for a diagram
 */
function updateIndexLastUpdated(diagramId: string): void {
  const index = loadIndex();
  const entry = index.diagrams.find(d => d.id === diagramId);

  if (entry) {
    entry.lastUpdated = new Date().toISOString().split('T')[0];
    const tempPath = `${INDEX_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
    fs.renameSync(tempPath, INDEX_FILE);
  }
}

/**
 * Find a node by ID in a diagram
 */
export function findNode(diagram: Diagram, nodeId: string): Diagram['nodes'][0] | undefined {
  return diagram.nodes.find(n => n.id === nodeId);
}

/**
 * Find all children of a node
 */
export function getChildren(diagram: Diagram, nodeId: string): Diagram['nodes'] {
  const node = findNode(diagram, nodeId);
  if (!node?.children?.length) return [];

  return node.children
    .map(id => findNode(diagram, id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);
}

/**
 * Get the path from root to a node
 */
export function getPathToNode(diagram: Diagram, nodeId: string): Diagram['nodes'] {
  const path: Diagram['nodes'] = [];
  let current = findNode(diagram, nodeId);

  while (current) {
    path.unshift(current);
    current = current.parentId ? findNode(diagram, current.parentId) : undefined;
  }

  return path;
}

/**
 * List all available diagrams
 */
export function listDiagrams(): DiagramIndex['diagrams'] {
  return loadIndex().diagrams;
}

/**
 * Get the default diagram ID
 */
export function getDefaultDiagramId(): string {
  return loadIndex().defaultDiagram;
}

/**
 * Apply computed positions to diagram nodes and save
 */
export function applyPositions(diagram: Diagram, positions: Map<string, { x: number; y: number }>): void {
  for (const node of diagram.nodes) {
    const pos = positions.get(node.id);
    if (pos) {
      node.position = pos;
    }
  }
  saveDiagram(diagram);
}
