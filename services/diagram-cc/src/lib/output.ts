import type { DiagramNode, OutputFormat, Diagram } from '../types';
import { getGlobalFormat } from '../types';

/**
 * Format a single node for output
 */
export function formatNode(node: DiagramNode, format?: OutputFormat): string {
  const fmt = format ?? getGlobalFormat();

  switch (fmt) {
    case 'json':
      return JSON.stringify(node, null, 2);

    case 'table':
      return formatNodeTable(node);

    case 'compact':
    default:
      return formatNodeCompact(node);
  }
}

/**
 * Compact format: one line per node
 * Example: B-A1b-19 (decision) | Is Valid? | planned | parent:B-A1b
 */
function formatNodeCompact(node: DiagramNode): string {
  const parts = [
    node.id,
    `(${node.type})`,
    '|',
    node.title,
  ];

  if (node.parentId) {
    parts.push('|', `parent:${node.parentId}`);
  }

  if (node.children?.length) {
    parts.push('|', `children:${node.children.length}`);
  }

  return parts.join(' ');
}

/**
 * Table format for single node
 */
function formatNodeTable(node: DiagramNode): string {
  const lines = [
    `ID:          ${node.id}`,
    `Type:        ${node.type}`,
    `Title:       ${node.title}`,
  ];

  if (node.description) {
    lines.push(`Description: ${node.description}`);
  }
  if (node.parentId) {
    lines.push(`Parent:      ${node.parentId}`);
  }
  if (node.children?.length) {
    lines.push(`Children:    ${node.children.join(', ')}`);
  }
  if (node.docsPath) {
    lines.push(`Docs:        ${node.docsPath}`);
  }
  if (node.linearIssues?.length) {
    lines.push(`Linear:      ${node.linearIssues.join(', ')}`);
  }
  if (node.codeFiles?.length) {
    lines.push(`Code:        ${node.codeFiles.join(', ')}`);
  }
  if (node.data) {
    lines.push(`Data:        ${JSON.stringify(node.data)}`);
  }

  return lines.join('\n');
}

/**
 * Format multiple nodes
 */
export function formatNodes(nodes: DiagramNode[], format?: OutputFormat): string {
  const fmt = format ?? getGlobalFormat();

  switch (fmt) {
    case 'json':
      return JSON.stringify(nodes, null, 2);

    case 'table':
      return nodes.map(n => formatNodeTable(n) + '\n').join('\n---\n');

    case 'compact':
    default:
      return nodes.map(n => formatNodeCompact(n)).join('\n');
  }
}

/**
 * Format a tree view of nodes
 */
export function formatTree(
  diagram: Diagram,
  rootId: string,
  maxDepth: number = Infinity,
  format?: OutputFormat
): string {
  const fmt = format ?? getGlobalFormat();

  if (fmt === 'json') {
    return JSON.stringify(buildTreeObject(diagram, rootId, maxDepth), null, 2);
  }

  const lines: string[] = [];
  buildTreeLines(diagram, rootId, 0, maxDepth, lines, '');
  return lines.join('\n');
}

/**
 * Build tree lines for compact/table output
 */
function buildTreeLines(
  diagram: Diagram,
  nodeId: string,
  depth: number,
  maxDepth: number,
  lines: string[],
  prefix: string
): void {
  const node = diagram.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const indent = prefix + (depth > 0 ? '  ' : '');
  const marker = depth > 0 ? '├─ ' : '';

  lines.push(`${indent}${marker}${node.id} (${node.type}) ${node.title}`);

  if (depth < maxDepth && node.children?.length) {
    for (const childId of node.children) {
      buildTreeLines(diagram, childId, depth + 1, maxDepth, lines, indent);
    }
  }
}

/**
 * Build tree object for JSON output
 */
function buildTreeObject(
  diagram: Diagram,
  nodeId: string,
  maxDepth: number,
  depth: number = 0
): Record<string, unknown> | null {
  const node = diagram.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const obj: Record<string, unknown> = {
    id: node.id,
    type: node.type,
    title: node.title,
  };

  if (depth < maxDepth && node.children?.length) {
    obj.children = node.children
      .map(id => buildTreeObject(diagram, id, maxDepth, depth + 1))
      .filter(Boolean);
  }

  return obj;
}

/**
 * Format a path from root to node
 */
export function formatPath(nodes: DiagramNode[], format?: OutputFormat): string {
  const fmt = format ?? getGlobalFormat();

  if (fmt === 'json') {
    return JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, title: n.title })), null, 2);
  }

  return nodes.map(n => n.id).join(' → ');
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(`✓ ${message}`);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(`✗ ${message}`);
}
