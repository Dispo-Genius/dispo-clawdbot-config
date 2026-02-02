/**
 * Types for diagram layout algorithm
 * Minimal subset of system-diagram types needed for layout
 */

/** Node types determine visual styling and dimensions */
export type NodeType =
  | 'system'
  | 'subsystem'
  | 'flow'
  | 'component'
  | 'external'
  | 'trigger'
  | 'process'
  | 'decision'
  | 'database'
  | 'api-call'
  | 'transform'
  | 'ai-agent'
  | 'queue';

/** Position on the canvas */
export interface Position {
  x: number;
  y: number;
}

/** Minimal node interface for layout */
export interface LayoutNode {
  id: string;
  type: NodeType;
}

/** Edge for layout calculations */
export interface LayoutEdge {
  source: string;
  target: string;
  label?: string;
}

/** Input to layout algorithm */
export interface LayoutInput {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

/** Result of layout calculation */
export interface LayoutResult {
  positions: Map<string, Position>;
  width: number;
  height: number;
}
