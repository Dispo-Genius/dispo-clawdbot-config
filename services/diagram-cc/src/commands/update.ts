import { Command } from 'commander';
import { loadDiagram, saveDiagram, findNode, getDefaultDiagramId } from '../lib/loader';
import { validateTitle } from '../lib/validation';
import { formatNode, success, error } from '../lib/output';

export const update = new Command('update')
  .description('Update an existing node')
  .argument('<id>', 'Node ID')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-t, --title <title>', 'New title')
  .option('--desc <description>', 'New description')
  .option('--docs <path>', 'Documentation path')
  .option('--linear <issues>', 'Linear issue IDs (comma-separated, replaces existing)')
  .option('--add-linear <issues>', 'Add Linear issue IDs (comma-separated)')
  .option('--code <files>', 'Code file paths (comma-separated, replaces existing)')
  .option('--add-code <files>', 'Add code file paths (comma-separated)')
  .option('--data <json>', 'Data object (JSON, replaces existing)')
  .option('--dry-run', 'Show what would be updated without saving')
  .action((id: string, options) => {
    try {
      const diagram = loadDiagram(options.diagram);
      const node = findNode(diagram, id);

      if (!node) {
        error(`Node not found: ${id}`);
        process.exit(1);
      }

      // Track changes for dry run
      const changes: string[] = [];

      // Update title
      if (options.title) {
        const validation = validateTitle(node.type, options.title);
        if (!validation.valid) {
          error('Title validation failed:');
          validation.errors.forEach(e => console.log(`  - ${e}`));
          process.exit(1);
        }
        validation.warnings.forEach(w => console.log(`Warning: ${w}`));
        changes.push(`title: "${node.title}" → "${options.title}"`);
        node.title = options.title;
      }

      // Update description
      if (options.desc !== undefined) {
        changes.push(`description: updated`);
        node.description = options.desc || undefined;
      }

      // Update docs path
      if (options.docs !== undefined) {
        changes.push(`docsPath: "${node.docsPath ?? '(none)'}" → "${options.docs || '(none)'}"`);
        node.docsPath = options.docs || undefined;
      }

      // Update linear issues
      if (options.linear !== undefined) {
        const newIssues = options.linear ? options.linear.split(',').map((s: string) => s.trim()) : [];
        changes.push(`linearIssues: replaced`);
        node.linearIssues = newIssues.length > 0 ? newIssues : undefined;
      }

      // Add linear issues
      if (options.addLinear) {
        const toAdd = options.addLinear.split(',').map((s: string) => s.trim());
        if (!node.linearIssues) node.linearIssues = [];
        node.linearIssues.push(...toAdd);
        changes.push(`linearIssues: added ${toAdd.join(', ')}`);
      }

      // Update code files
      if (options.code !== undefined) {
        const newFiles = options.code ? options.code.split(',').map((s: string) => s.trim()) : [];
        changes.push(`codeFiles: replaced`);
        node.codeFiles = newFiles.length > 0 ? newFiles : undefined;
      }

      // Add code files
      if (options.addCode) {
        const toAdd = options.addCode.split(',').map((s: string) => s.trim());
        if (!node.codeFiles) node.codeFiles = [];
        node.codeFiles.push(...toAdd);
        changes.push(`codeFiles: added ${toAdd.join(', ')}`);
      }

      // Update data
      if (options.data) {
        try {
          const newData = JSON.parse(options.data);
          changes.push(`data: replaced`);
          node.data = newData;
        } catch (e) {
          error('Invalid JSON for --data');
          process.exit(1);
        }
      }

      if (changes.length === 0) {
        console.log('No changes specified.');
        return;
      }

      if (options.dryRun) {
        console.log('Dry run - would update:');
        changes.forEach(c => console.log(`  ${c}`));
        console.log('\nResult:');
        console.log(formatNode(node));
        return;
      }

      // Save diagram
      saveDiagram(diagram);

      success(`Updated node: ${id}`);
      changes.forEach(c => console.log(`  ${c}`));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
