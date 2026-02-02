import type { Diagram } from '../types';
import { findNode } from './loader';

/**
 * Parse a node ID into its components
 * Examples:
 *   "B-A1b" -> { prefix: "B-A1", suffix: "b" }
 *   "B-A1b-19" -> { prefix: "B-A1b-", suffix: "19" }
 *   "B-A1a-3c" -> { prefix: "B-A1a-3", suffix: "c" }
 */
interface IdParts {
  prefix: string;
  suffix: string;
  isNumeric: boolean;
  isAlpha: boolean;
}

function parseId(id: string): IdParts {
  // Match trailing number or letter
  const numMatch = id.match(/^(.+-)(\d+)$/);
  if (numMatch) {
    return {
      prefix: numMatch[1],
      suffix: numMatch[2],
      isNumeric: true,
      isAlpha: false,
    };
  }

  const alphaMatch = id.match(/^(.+?)([a-z])$/);
  if (alphaMatch) {
    return {
      prefix: alphaMatch[1],
      suffix: alphaMatch[2],
      isNumeric: false,
      isAlpha: true,
    };
  }

  // Can't parse - treat whole thing as prefix
  return {
    prefix: id,
    suffix: '',
    isNumeric: false,
    isAlpha: false,
  };
}

/**
 * Increment a suffix
 */
function incrementSuffix(suffix: string, isNumeric: boolean): string {
  if (isNumeric) {
    return String(parseInt(suffix, 10) + 1);
  }

  // Alpha increment: a -> b -> c ... z -> aa (but we'll just go to next letter)
  const code = suffix.charCodeAt(0);
  if (code >= 97 && code < 122) { // a-y
    return String.fromCharCode(code + 1);
  }
  // z case - would need aa, but for now just return za
  return 'za';
}

/**
 * Generate the next ID for a child of a parent node
 */
export function generateNextId(diagram: Diagram, parentId: string): string {
  const parent = findNode(diagram, parentId);
  if (!parent) {
    throw new Error(`Parent node not found: ${parentId}`);
  }

  const children = parent.children || [];

  if (children.length === 0) {
    // First child - add -1 suffix
    return `${parentId}-1`;
  }

  // Analyze existing children to determine pattern
  const childParts = children.map(id => ({
    id,
    parts: parseId(id),
  }));

  // Find the highest numeric suffix
  const numericChildren = childParts.filter(c => c.parts.isNumeric);
  if (numericChildren.length > 0) {
    const maxNum = Math.max(
      ...numericChildren.map(c => parseInt(c.parts.suffix, 10))
    );
    return `${parentId}-${maxNum + 1}`;
  }

  // Find the highest alpha suffix
  const alphaChildren = childParts.filter(c => c.parts.isAlpha);
  if (alphaChildren.length > 0) {
    const maxAlpha = alphaChildren.reduce((max, c) =>
      c.parts.suffix > max ? c.parts.suffix : max
    , 'a');
    const nextAlpha = incrementSuffix(maxAlpha, false);

    // Need to figure out the prefix pattern
    // e.g., B-A1a -> next is B-A1b, not B-A1a-1
    const sampleParts = alphaChildren[0].parts;
    return sampleParts.prefix + nextAlpha;
  }

  // Fallback - add -1
  return `${parentId}-1`;
}

/**
 * Validate that an ID is unique in the diagram
 */
export function isIdUnique(diagram: Diagram, id: string): boolean {
  return !diagram.nodes.some(n => n.id === id);
}

/**
 * Validate ID format (basic check)
 */
export function isValidIdFormat(id: string): boolean {
  // Allow alphanumeric with hyphens, must start with letter
  return /^[A-Za-z][A-Za-z0-9-]*$/.test(id);
}
