import type { DiagramNode, NodeType } from '../types';

/**
 * Template definition for a node type
 */
interface NodeTemplate {
  type: NodeType;
  titleConvention: string;
  dataFields?: string[];
  validate?: (title: string) => string | null; // Returns error message or null
}

/**
 * All node type templates
 */
export const TEMPLATES: Record<NodeType, NodeTemplate> = {
  system: {
    type: 'system',
    titleConvention: '[Name] System',
  },

  subsystem: {
    type: 'subsystem',
    titleConvention: 'Noun phrase',
  },

  flow: {
    type: 'flow',
    titleConvention: 'Action noun',
    dataFields: ['outputs'],
  },

  trigger: {
    type: 'trigger',
    titleConvention: 'Event description',
    dataFields: ['trigger'],
  },

  process: {
    type: 'process',
    titleConvention: 'Verb + Object',
  },

  decision: {
    type: 'decision',
    titleConvention: 'Ends with ?',
    validate: (title: string) =>
      title.endsWith('?') ? null : 'Decision title must end with ?',
  },

  database: {
    type: 'database',
    titleConvention: 'Read/Write + table',
    dataFields: ['table', 'fields'],
  },

  'api-call': {
    type: 'api-call',
    titleConvention: 'Call [API]',
    dataFields: ['api', 'params'],
    validate: (title: string) =>
      title.toLowerCase().startsWith('call') ? null : 'API call title should start with "Call"',
  },

  transform: {
    type: 'transform',
    titleConvention: 'Standardize/Normalize',
    dataFields: ['schemaRef'],
  },

  'ai-agent': {
    type: 'ai-agent',
    titleConvention: '[Purpose] Agent',
    dataFields: ['model'],
    validate: (title: string) =>
      title.toLowerCase().endsWith('agent') ? null : 'AI agent title should end with "Agent"',
  },

  queue: {
    type: 'queue',
    titleConvention: '→ Route to [X]',
    dataFields: ['navigates_to'],
  },

  component: {
    type: 'component',
    titleConvention: 'Module name',
  },

  external: {
    type: 'external',
    titleConvention: 'Service name',
    dataFields: ['apiEndpoints'],
  },

  goto: {
    type: 'goto',
    titleConvention: '→ [Target]',
  },
};

/**
 * Get a template by type
 */
export function getTemplate(type: NodeType): NodeTemplate {
  return TEMPLATES[type];
}

/**
 * Create a node from a template
 */
export function createFromTemplate(
  type: NodeType,
  title: string,
  id: string,
  parentId?: string,
  options?: Partial<DiagramNode>
): DiagramNode {
  const template = TEMPLATES[type];

  // Validate title if template has validation
  if (template.validate) {
    const error = template.validate(title);
    if (error) {
      // For api-call and ai-agent, this is a warning not error
      if (type !== 'decision') {
        console.warn(`Warning: ${error}`);
      } else {
        throw new Error(error);
      }
    }
  }

  const node: DiagramNode = {
    id,
    type,
    title,
    ...options,
  };

  if (parentId) {
    node.parentId = parentId;
  }

  return node;
}

/**
 * List all available types with their conventions
 */
export function listTypes(): string {
  const lines = [
    'Available node types:',
    '',
    'Type         | Title Convention',
    '-------------|------------------',
  ];

  for (const [type, template] of Object.entries(TEMPLATES)) {
    lines.push(
      `${type.padEnd(12)} | ${template.titleConvention}`
    );
  }

  return lines.join('\n');
}
