import { Command } from 'commander';
import { loadDiagram, getDefaultDiagramId, getDiagramFolderPath } from '../lib/loader';
import { success, error } from '../lib/output';
import * as fs from 'fs';
import * as path from 'path';

const SECONDARY_LABELS = ['not found', 'no', 'false', 'invalid', 'error', 'fail', 'skip'];

interface NodeData {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
}

interface EdgeData {
  source: string;
  target: string;
  label?: string;
}

interface DiagramData {
  id: string;
  nodes: NodeData[];
  edges: EdgeData[];
}

export const alignCheck = new Command('align-check')
  .description('Check alignment and symmetry of diagram nodes')
  .option('-d, --diagram <diagram>', 'Diagram ID', getDefaultDiagramId())
  .option('-p, --parent <nodeId>', 'Check only a specific sub-diagram file')
  .option('--verbose', 'Show all details including layer and column groupings')
  .action((options) => {
    try {
      let diagramData: DiagramData;

      if (options.parent) {
        // Load specific sub-diagram file
        const folderPath = getDiagramFolderPath(options.diagram);
        if (!folderPath) {
          error('Diagram is not folder-based');
          process.exit(1);
        }

        // Find the file for this parent
        const possiblePaths = [
          path.join(folderPath, 'nodes', 'background', 'B-A', `${options.parent}.json`),
          path.join(folderPath, 'nodes', 'background', 'B-B', `${options.parent}.json`),
          path.join(folderPath, 'nodes', 'live', `${options.parent}.json`),
        ];

        let filePath: string | null = null;
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            filePath = p;
            break;
          }
        }

        if (!filePath) {
          error(`Sub-diagram file not found for ${options.parent}`);
          process.exit(1);
        }

        diagramData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } else {
        // Load main diagram
        const diagram = loadDiagram(options.diagram);
        diagramData = {
          id: diagram.id,
          nodes: diagram.nodes as NodeData[],
          edges: diagram.edges || [],
        };
      }

      const nodeMap = new Map(diagramData.nodes.map(n => [n.id, n]));

      console.log('\n=== ALIGNMENT CHECK: ' + diagramData.id + ' ===\n');

      if (options.verbose) {
        // Group by Y (layers)
        const byY = new Map<number, NodeData[]>();
        for (const node of diagramData.nodes) {
          if (!node.position) continue;
          const y = node.position.y;
          if (!byY.has(y)) byY.set(y, []);
          byY.get(y)!.push(node);
        }

        console.log('LAYERS (by Y-coordinate):');
        const sortedY = [...byY.keys()].sort((a, b) => a - b);
        for (const y of sortedY) {
          const nodes = byY.get(y)!.sort((a, b) => a.position.x - b.position.x);
          const nodeStrs = nodes.map(n => n.id + '(x=' + n.position.x + ')');
          console.log('  y=' + y + ': ' + nodeStrs.join(', '));
        }

        // Group by X (vertical columns)
        const byX = new Map<number, NodeData[]>();
        for (const node of diagramData.nodes) {
          if (!node.position) continue;
          const x = node.position.x;
          if (!byX.has(x)) byX.set(x, []);
          byX.get(x)!.push(node);
        }

        console.log('\nVERTICAL COLUMNS (by X-coordinate):');
        const sortedX = [...byX.keys()].sort((a, b) => a - b);
        for (const x of sortedX) {
          const nodes = byX.get(x)!.sort((a, b) => a.position.y - b.position.y);
          const nodeStrs = nodes.map(n => n.id + '(y=' + n.position.y + ')');
          console.log('  x=' + x + ': ' + nodeStrs.join(', '));
        }
      }

      // Check decision node symmetry
      console.log('DECISION/DATABASE NODE BRANCH SYMMETRY:');
      const decisionNodes = diagramData.nodes.filter(n => n.type === 'decision' || n.type === 'database');

      let symmetricCount = 0;
      let asymmetricCount = 0;

      for (const decision of decisionNodes) {
        if (!decision.position) continue;

        const children = diagramData.edges
          .filter(e => e.source === decision.id)
          .map(e => ({ node: nodeMap.get(e.target)!, label: e.label }))
          .filter(c => c.node && c.node.position);

        if (children.length >= 2) {
          const parentX = decision.position.x;
          console.log('\n  ' + decision.id + ' "' + decision.title + '" at x=' + parentX);

          for (const child of children) {
            const offset = child.node.position.x - parentX;
            const direction = offset < 0 ? 'LEFT' : offset > 0 ? 'RIGHT' : 'CENTER';
            const isPrimary = !SECONDARY_LABELS.some(s => (child.label || '').toLowerCase().includes(s));
            const marker = isPrimary ? '' : ' [secondary]';
            console.log('    -> ' + child.node.id + ' "' + (child.label || 'no label') + '"' + marker + ': x=' + child.node.position.x + ' (' + direction + ' ' + Math.abs(offset) + 'px)');
          }

          // Check symmetry (20px tolerance for grid snapping)
          const offsets = children.map(c => c.node.position.x - parentX);
          const sum = offsets.reduce((a, b) => a + b, 0);
          if (Math.abs(sum) <= 20) {
            console.log('    [OK] SYMMETRIC');
            symmetricCount++;
          } else {
            // Check if children are shared (have multiple parents)
            const sharedChildren = children.filter(c => {
              const parents = diagramData.edges.filter(e => e.target === c.node.id);
              return parents.length > 1;
            });
            if (sharedChildren.length > 0) {
              console.log('    [SKIP] Has shared children: ' + sharedChildren.map(c => c.node.id).join(', '));
            } else {
              console.log('    [FAIL] ASYMMETRIC (offset sum = ' + sum + ')');
              asymmetricCount++;
            }
          }
        }
      }

      console.log('\n--- Summary ---');
      console.log('Symmetric: ' + symmetricCount);
      console.log('Asymmetric: ' + asymmetricCount);
      if (asymmetricCount === 0) {
        success('All decision branches with exclusive children are symmetric');
      }
      console.log('');

    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
