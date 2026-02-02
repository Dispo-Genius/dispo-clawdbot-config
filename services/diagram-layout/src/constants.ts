/**
 * Layout constants for diagram layout algorithm
 */

import type { NodeType } from './types';

/** Node dimensions by type (matches SystemNode.tsx typeConfig) */
export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
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
};

/** Grid size for snapping (matches canvas grid) */
export const GRID_SIZE = 20;

/** Grid cell dimensions for layout */
export const CELL_WIDTH = 300; // node width (200) + horizontal spacing (100)
export const CELL_HEIGHT = 200; // node height (~90) + vertical spacing (110)

/** Edge labels that indicate "secondary" or negative paths (positioned right) */
export const SECONDARY_LABELS = ['not found', 'no', 'false', 'invalid', 'error', 'fail', 'skip'];
