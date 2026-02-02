import type { DiagramNode, NodeType } from '../types';

// Valid node types
export const VALID_TYPES: NodeType[] = [
  'system',
  'subsystem',
  'flow',
  'trigger',
  'process',
  'decision',
  'database',
  'api-call',
  'transform',
  'ai-agent',
  'queue',
  'component',
  'external',
  'goto',
];

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a node type
 */
export function isValidType(type: string): type is NodeType {
  return VALID_TYPES.includes(type as NodeType);
}

/**
 * Validate node title based on type conventions
 */
export function validateTitle(type: NodeType, title: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  switch (type) {
    case 'decision':
      if (!title.endsWith('?')) {
        result.errors.push('Decision titles must end with ?');
        result.valid = false;
      }
      break;

    case 'api-call':
      if (!title.toLowerCase().startsWith('call')) {
        result.warnings.push('API call titles typically start with "Call"');
      }
      break;

    case 'ai-agent':
      if (!title.toLowerCase().endsWith('agent')) {
        result.warnings.push('AI agent titles typically end with "Agent"');
      }
      break;

    case 'system':
      if (!title.toLowerCase().includes('system')) {
        result.warnings.push('System titles typically include "System"');
      }
      break;
  }

  return result;
}

/**
 * Validate a complete node
 */
export function validateNode(node: Partial<DiagramNode>): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Required fields
  if (!node.id) {
    result.errors.push('Node ID is required');
    result.valid = false;
  }

  if (!node.type) {
    result.errors.push('Node type is required');
    result.valid = false;
  } else if (!isValidType(node.type)) {
    result.errors.push(`Invalid type: ${node.type}. Valid types: ${VALID_TYPES.join(', ')}`);
    result.valid = false;
  }

  if (!node.title) {
    result.errors.push('Node title is required');
    result.valid = false;
  }

  // Title validation based on type
  if (node.type && node.title && isValidType(node.type)) {
    const titleValidation = validateTitle(node.type, node.title);
    result.errors.push(...titleValidation.errors);
    result.warnings.push(...titleValidation.warnings);
    if (!titleValidation.valid) {
      result.valid = false;
    }
  }

  return result;
}

/**
 * Check if a node can be deleted (must have no children)
 */
export function canDelete(node: DiagramNode): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (node.children && node.children.length > 0) {
    result.errors.push(
      `Cannot delete node with children. Has ${node.children.length} children: ${node.children.join(', ')}`
    );
    result.valid = false;
  }

  return result;
}
