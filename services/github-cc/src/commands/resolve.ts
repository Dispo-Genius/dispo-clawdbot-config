import { Command } from 'commander';
import { execSync } from 'child_process';
import { isGitRepo } from '../api/git';
import { getStatus } from '../utils/parsers';
import { output, errorOutput, getFormat } from '../utils/output';

export const resolve = new Command('resolve')
  .description('Show conflict markers for a file')
  .argument('<file>', 'File to show conflicts for')
  .action((file: string) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      // Check if file is in conflicts
      const status = getStatus();
      const isConflicted = status.conflicts.some(c => c.path === file);

      if (!isConflicted) {
        errorOutput(`${file} is not in conflict`);
      }

      // Read file and extract conflict regions
      let content: string;
      try {
        content = execSync(`cat "${file}"`, { encoding: 'utf-8' });
      } catch {
        errorOutput(`cannot read file: ${file}`);
      }

      const lines = content!.split('\n');
      const conflicts: Array<{
        startLine: number;
        ours: string[];
        theirs: string[];
        endLine: number;
      }> = [];

      let i = 0;
      while (i < lines.length) {
        if (lines[i].startsWith('<<<<<<<')) {
          const startLine = i + 1;
          const ours: string[] = [];
          const theirs: string[] = [];
          i++;

          // Collect "ours" lines
          while (i < lines.length && !lines[i].startsWith('=======')) {
            ours.push(lines[i]);
            i++;
          }
          i++; // Skip =======

          // Collect "theirs" lines
          while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
            theirs.push(lines[i]);
            i++;
          }

          const endLine = i + 1;
          conflicts.push({ startLine, ours, theirs, endLine });
        }
        i++;
      }

      if (getFormat() === 'json') {
        output(JSON.stringify({ file, conflictCount: conflicts.length, conflicts }, null, 2));
        return;
      }

      // Compact format: show conflict regions
      const header = `resolve:${file},conflicts[${conflicts.length}]`;
      const regions = conflicts.map((c, idx) => {
        return `#${idx + 1}(L${c.startLine}-${c.endLine}):ours[${c.ours.length}]|theirs[${c.theirs.length}]`;
      });

      output([header, ...regions].join('\n'));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
