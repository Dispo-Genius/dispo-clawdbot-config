// Node types supported in diagrams
export type NodeType =
  | 'system'
  | 'subsystem'
  | 'flow'
  | 'trigger'
  | 'process'
  | 'decision'
  | 'database'
  | 'api-call'
  | 'transform'
  | 'ai-agent'
  | 'queue'
  | 'component'
  | 'external'
  | 'goto';

// Position for node layout
export interface Position {
  x: number;
  y: number;
}

// Edge connection between nodes
export interface DiagramEdge {
  source: string;
  target: string;
  label?: string;
}

// Core diagram node structure
export interface DiagramNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  position?: Position;
  parentId?: string;
  children?: string[];
  docsPath?: string;
  linearIssues?: string[];
  codeFiles?: string[];
  data?: Record<string, unknown>;
}

// Full diagram document
export interface Diagram {
  id: string;
  title: string;
  description: string;
  version: string;
  lastUpdated: string;
  rootNodeId: string;
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
}

// Diagram index entry
export interface DiagramIndexEntry {
  id: string;
  title: string;
  description: string;
  file: string;
  status: string;
  lastUpdated: string;
}

// Diagram index file
export interface DiagramIndex {
  diagrams: DiagramIndexEntry[];
  defaultDiagram: string;
}

// Output format types
export type OutputFormat = 'compact' | 'json' | 'table';

// Global state for output format
let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getGlobalFormat(): OutputFormat {
  return globalFormat;
}
