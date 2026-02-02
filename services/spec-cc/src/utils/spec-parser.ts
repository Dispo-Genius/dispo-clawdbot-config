import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import { glob } from 'glob';
import type { SpecData } from './output';

// Get references for a folder-based spec
function getReferences(specPath: string): string[] {
  const specDir = dirname(specPath);
  const refsDir = join(specDir, 'references');

  if (!existsSync(refsDir)) {
    return [];
  }

  try {
    return readdirSync(refsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  } catch {
    return [];
  }
}

// Valid status values
export const VALID_STATUSES = ['draft', 'pending', 'approved', 'blocked', 'completed'] as const;
export type SpecStatus = typeof VALID_STATUSES[number];

// Normalize status from various formats in spec files
function normalizeStatus(raw: string): SpecStatus {
  const lower = raw.toLowerCase().trim();

  // Map various status formats to canonical values
  if (lower === 'done' || lower === 'complete' || lower === 'completed') return 'completed';
  if (lower === 'in progress' || lower === 'in-progress' || lower === 'wip') return 'pending';
  if (lower === 'review' || lower === 'pending review' || lower === 'pending') return 'pending';
  if (lower === 'blocked' || lower === 'on hold') return 'blocked';
  if (lower === 'approved' || lower === 'ready') return 'approved';
  if (lower === 'draft' || lower === 'new') return 'draft';

  // Default to draft if unknown
  return 'draft';
}

// Extract status from spec content
function extractStatus(content: string): SpecStatus {
  // Look for **Status:** pattern (case insensitive)
  const statusMatch = content.match(/\*\*Status:\*\*\s*([^\n*]+)/i);
  if (statusMatch) {
    return normalizeStatus(statusMatch[1]);
  }

  // Check session logs for "Status: X" pattern
  const sessionStatusMatch = content.match(/\*\*Status:\*\*\s*(\w+)/i);
  if (sessionStatusMatch) {
    return normalizeStatus(sessionStatusMatch[1]);
  }

  return 'draft';
}

// Extract Linear ticket ID
function extractLinearId(content: string): string | null {
  // Pattern: **Linear:** [PRO-XXX](url) or **Ticket:** PRO-XXX
  const linearMatch = content.match(/\*\*(Linear|Ticket):\*\*\s*\[?([A-Z]+-\d+)/i);
  if (linearMatch) {
    return linearMatch[2];
  }

  // Also check for just PRO-XXX or DIS-XXX patterns in first few lines
  const headerLines = content.split('\n').slice(0, 10).join('\n');
  const ticketMatch = headerLines.match(/\b(PRO|DIS|ENG)-\d+\b/);
  if (ticketMatch) {
    return ticketMatch[0];
  }

  return null;
}

// Count sessions in spec
function countSessions(content: string): number {
  const sessionMatches = content.match(/###\s*Session\s+\d+/gi);
  return sessionMatches ? sessionMatches.length : 0;
}

// Extract title from first H1
function extractTitle(content: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].replace(/^Spec:\s*/i, '').trim() : 'Untitled';
}

// Get specs directory
export function getSpecsDir(): string {
  // Try project-local first, then global
  const projectLocal = join(process.cwd(), '.claude/specs');
  if (existsSync(projectLocal)) {
    return projectLocal;
  }

  // Fallback to home directory
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return join(home, '.claude/specs');
}

// Parse a single spec file
export function parseSpec(filePath: string): SpecData {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Determine if this is a folder-based spec
  const isFolder = basename(filePath) === 'SPEC.md';
  const slug = isFolder ? basename(dirname(filePath)) : basename(filePath, '.md');

  // Get references if folder-based
  const references = isFolder ? getReferences(filePath) : [];

  return {
    slug,
    status: extractStatus(content),
    linearId: extractLinearId(content),
    lineCount: lines.length,
    sessionCount: countSessions(content),
    referenceCount: references.length,
    references,
    path: filePath,
    title: extractTitle(content),
    isFolder,
  };
}

// Find all specs
export async function findAllSpecs(specsDir?: string): Promise<SpecData[]> {
  const dir = specsDir || getSpecsDir();

  if (!existsSync(dir)) {
    return [];
  }

  // Find flat specs (*.md) and folder specs (*/SPEC.md)
  const flatSpecs = await glob('*.md', { cwd: dir, ignore: ['INDEX.md'] });
  const folderSpecs = await glob('*/SPEC.md', { cwd: dir });

  const specs: SpecData[] = [];

  for (const file of flatSpecs) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isFile()) {
      specs.push(parseSpec(fullPath));
    }
  }

  for (const file of folderSpecs) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isFile()) {
      specs.push(parseSpec(fullPath));
    }
  }

  // Sort by status priority then slug
  const statusOrder: Record<SpecStatus, number> = {
    pending: 0,
    approved: 1,
    draft: 2,
    blocked: 3,
    completed: 4,
  };

  specs.sort((a, b) => {
    const statusDiff = statusOrder[a.status as SpecStatus] - statusOrder[b.status as SpecStatus];
    if (statusDiff !== 0) return statusDiff;
    return a.slug.localeCompare(b.slug);
  });

  return specs;
}

// Find spec by slug
export async function findSpec(slug: string, specsDir?: string): Promise<SpecData | null> {
  const dir = specsDir || getSpecsDir();

  // Try flat file first
  const flatPath = join(dir, `${slug}.md`);
  if (existsSync(flatPath)) {
    return parseSpec(flatPath);
  }

  // Try folder
  const folderPath = join(dir, slug, 'SPEC.md');
  if (existsSync(folderPath)) {
    return parseSpec(folderPath);
  }

  return null;
}

// Update status in spec file
export function updateStatusInFile(filePath: string, newStatus: SpecStatus): boolean {
  const content = readFileSync(filePath, 'utf-8');

  // Replace **Status:** line
  const statusPattern = /(\*\*Status:\*\*\s*)([^\n*]+)/i;

  if (statusPattern.test(content)) {
    const updated = content.replace(statusPattern, `$1${newStatus}`);
    const { writeFileSync } = require('fs');
    writeFileSync(filePath, updated, 'utf-8');
    return true;
  }

  // If no status field, add one after the title
  const lines = content.split('\n');
  const titleIndex = lines.findIndex(l => l.startsWith('# '));
  if (titleIndex >= 0) {
    lines.splice(titleIndex + 1, 0, '', `**Status:** ${newStatus}`);
    const { writeFileSync } = require('fs');
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return true;
  }

  return false;
}
