import { Command } from 'commander';
import { loadDiagram, saveDiagram, findNode, getDefaultDiagramId, applyPositions } from '../lib/loader';
import { autoLayoutSubtree } from '../lib/layout';
import { generateNextId, isIdUnique, isValidIdFormat } from '../lib/id-generator';
import { createFromTemplate, listTypes } from '../templates';
import { isValidType, validateNode } from '../lib/validation';
import { formatNode, success, error } from '../lib/output';
import type { NodeType } from '../types';

export const create = new Command('create')
  .description('Create a new node')
  .argument('<type>', 'Node type (use "types" to list all)')
  .argument('<title>', 'Node title')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-p, --parent <id>', 'Parent node ID (required)')
  .option('--id <id>', 'Override auto-generated ID')
  .option('--desc <description>', 'Node description')
  .option('--docs <path>', 'Documentation path')
  .option('--linear <issues>', 'Linear issue IDs (comma-separated)')
  .option('--code <files>', 'Code file paths (comma-separated)')
  .option('--dry-run', 'Show what would be created without saving')
  .action((type: string, title: string, options) => {
    try {
      // Handle special "types" command
      if (type === 'types') {
        console.log(listTypes());
        return;
      }

      // Validate type
      if (!isValidType(type)) {
        error(`Invalid type: ${type}`);
        console.log('\n' + listTypes());
        process.exit(1);
      }

      // Parent is required
      if (!options.parent) {
        error('Parent node ID is required. Use --parent <id>');
        process.exit(1);
      }

      const diagram = loadDiagram(options.diagram);

      // Validate parent exists
      const parent = findNode(diagram, options.parent);
      if (!parent) {
        error(`Parent node not found: ${options.parent}`);
        process.exit(1);
      }

      // Generate or validate ID
      let nodeId: string;
      if (options.id) {
        if (!isValidIdFormat(options.id)) {
          error(`Invalid ID format: ${options.id}`);
          process.exit(1);
        }
        if (!isIdUnique(diagram, options.id)) {
          error(`ID already exists: ${options.id}`);
          process.exit(1);
        }
        nodeId = options.id;
      } else {
        nodeId = generateNextId(diagram, options.parent);
      }

      // Build node options
      const nodeOptions: Record<string, unknown> = {};
      if (options.desc) nodeOptions.description = options.desc;
      if (options.docs) nodeOptions.docsPath = options.docs;
      if (options.linear) nodeOptions.linearIssues = options.linear.split(',').map((s: string) => s.trim());
      if (options.code) nodeOptions.codeFiles = options.code.split(',').map((s: string) => s.trim());

      // Create node from template
      const node = createFromTemplate(
        type as NodeType,
        title,
        nodeId,
        options.parent,
        nodeOptions
      );

      // Validate the node
      const validation = validateNode(node);
      if (!validation.valid) {
        error('Validation failed:');
        validation.errors.forEach(e => console.log(`  - ${e}`));
        process.exit(1);
      }
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => console.log(`Warning: ${w}`));
      }

      if (options.dryRun) {
        console.log('Dry run - would create:');
        console.log(formatNode(node));
        return;
      }

      // Add node to diagram
      diagram.nodes.push(node);

      // Update parent's children array
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(nodeId);

      // Save diagram
      saveDiagram(diagram);

      // Auto-layout parent's subtree
      const positions = autoLayoutSubtree(diagram.nodes, diagram.edges || [], options.parent);
      applyPositions(diagram, positions);

      success(`Created node: ${nodeId}`);
      console.log(formatNode(node));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
