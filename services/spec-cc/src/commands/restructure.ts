import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { findSpec, getSpecsDir } from '../utils/spec-parser';
import { output, formatSuccess, errorOutput } from '../utils/output';
import { generateIndex } from './index-cmd';

// Extract sessions from spec content
function extractSessions(content: string): { main: string; sessions: Array<{ num: number; content: string }> } {
  const lines = content.split('\n');
  const sessions: Array<{ num: number; content: string }> = [];
  let mainLines: string[] = [];
  let currentSession: { num: number; lines: string[] } | null = null;

  for (const line of lines) {
    const sessionMatch = line.match(/^###\s*Session\s+(\d+)/i);

    if (sessionMatch) {
      // Save previous session if any
      if (currentSession) {
        sessions.push({
          num: currentSession.num,
          content: currentSession.lines.join('\n'),
        });
      }

      currentSession = {
        num: parseInt(sessionMatch[1], 10),
        lines: [line],
      };
    } else if (currentSession) {
      // Check if we hit a new H2 or H3 that's not a session
      if (line.match(/^##[^#]/) || (line.match(/^###/) && !line.match(/Session/i))) {
        // End current session, switch to main
        sessions.push({
          num: currentSession.num,
          content: currentSession.lines.join('\n'),
        });
        currentSession = null;
        mainLines.push(line);
      } else {
        currentSession.lines.push(line);
      }
    } else {
      mainLines.push(line);
    }
  }

  // Save last session if any
  if (currentSession) {
    sessions.push({
      num: currentSession.num,
      content: currentSession.lines.join('\n'),
    });
  }

  return { main: mainLines.join('\n'), sessions };
}

// Format session filename
function formatSessionFilename(num: number): string {
  return `session-${num.toString().padStart(3, '0')}.md`;
}

export const restructure = new Command('restructure')
  .description('Convert flat spec to folder structure')
  .argument('<slug>', 'Spec slug')
  .option('--dry-run', 'Show what would be done without making changes')
  .action(async (slug: string, options: { dryRun?: boolean }) => {
    try {
      const spec = await findSpec(slug);

      if (!spec) {
        errorOutput(`Spec "${slug}" not found`);
      }

      if (spec.isFolder) {
        errorOutput(`Spec "${slug}" is already in folder format`);
      }

      const specsDir = getSpecsDir();
      const content = readFileSync(spec.path, 'utf-8');
      const { main, sessions } = extractSessions(content);

      // Check if restructure is warranted
      if (spec.lineCount < 300 && sessions.length < 3) {
        errorOutput(`Spec has ${spec.lineCount} lines and ${sessions.length} sessions. Restructure recommended at 300+ lines or 3+ sessions.`);
      }

      const folderPath = join(specsDir, slug);
      const specPath = join(folderPath, 'SPEC.md');
      const sessionsPath = join(folderPath, 'sessions');
      const referencesPath = join(folderPath, 'references');

      if (options.dryRun) {
        const preview = [
          `Would create: ${folderPath}/`,
          `Would create: ${specPath} (${main.split('\n').length} lines)`,
          `Would create: ${referencesPath}/`,
        ];

        if (sessions.length > 0) {
          preview.push(`Would create: ${sessionsPath}/`);
          for (const session of sessions) {
            preview.push(`Would create: ${sessionsPath}/${formatSessionFilename(session.num)} (${session.content.split('\n').length} lines)`);
          }
        }

        preview.push(`Would delete: ${spec.path}`);
        output(preview.join('\n'));
        return;
      }

      // Create folder structure
      mkdirSync(folderPath, { recursive: true });
      mkdirSync(referencesPath, { recursive: true });

      // Write main spec with session reference
      let mainContent = main;
      if (sessions.length > 0) {
        mkdirSync(sessionsPath, { recursive: true });

        // Add session reference to main spec
        if (!mainContent.includes('## Session Log')) {
          mainContent += '\n\n## Session Log\n\nSee [sessions/](./sessions/) for detailed session logs.\n';
        }

        // Write session files
        for (const session of sessions) {
          const sessionFile = join(sessionsPath, formatSessionFilename(session.num));
          writeFileSync(sessionFile, session.content, 'utf-8');
        }
      }

      writeFileSync(specPath, mainContent, 'utf-8');

      // Delete original file
      unlinkSync(spec.path);

      // Regenerate index
      await generateIndex(specsDir);

      output(formatSuccess(`Restructured ${slug}`, {
        folder: folderPath,
        sessions: sessions.length,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
