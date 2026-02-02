/**
 * diagram-layout - Shared layout algorithm for system diagrams
 *
 * Used by:
 * - diagram-cc CLI tool
 * - dg-prototype diagram studio
 */

export { calculateLayout, snapToGrid, getNodeDimensions } from './layout';
export { NODE_DIMENSIONS, GRID_SIZE, CELL_WIDTH, CELL_HEIGHT, SECONDARY_LABELS } from './constants';
export type {
  NodeType,
  Position,
  LayoutNode,
  LayoutEdge,
  LayoutInput,
  LayoutResult,
} from './types';
