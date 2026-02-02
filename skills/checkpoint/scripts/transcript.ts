#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  tool_use_id?: string;
  content?: string;
}

interface Message {
  role: string;
  content: string | ContentBlock[];
}

interface JournalEntry {
  type: string;
  message?: Message;
  timestamp?: string;
  sessionId?: string;
}

interface TranscriptMessage {
  role: 'user' | 'claude';
  text: string;
  timestamp: string;
}

// Parse CLI arguments
function parseArgs(): { session?: string; ticket?: string; project?: string } {
  const args = process.argv.slice(2);
  const result: { session?: string; ticket?: string; project?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session' && args[i + 1]) {
      result.session = args[i + 1];
      i++;
    } else if (args[i] === '--ticket' && args[i + 1]) {
      result.ticket = args[i + 1];
      i++;
    } else if (args[i] === '--project' && args[i + 1]) {
      result.project = args[i + 1];
      i++;
    }
  }

  return result;
}

// Get project path for transcript lookup
function getProjectPath(projectDir: string): string {
  // Convert /Users/foo/bar to -Users-foo-bar format
  return projectDir.replace(/\//g, '-');
}

// Find the most recent session ID if not provided
function findLatestSession(projectDir: string): string | null {
  const projectPath = getProjectPath(projectDir);
  const claudeProjectsDir = join(homedir(), '.claude', 'projects', projectPath);

  if (!existsSync(claudeProjectsDir)) {
    return null;
  }

  const files = readdirSync(claudeProjectsDir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      path: join(claudeProjectsDir, f),
      mtime: new Date(readFileSync(join(claudeProjectsDir, f), 'utf-8').split('\n')[0] || '{}').getTime() || 0
    }));

  // Sort by file modification time (most recent first)
  files.sort((a, b) => {
    try {
      const statA = execSync(`stat -f %m "${a.path}"`, { encoding: 'utf-8' }).trim();
      const statB = execSync(`stat -f %m "${b.path}"`, { encoding: 'utf-8' }).trim();
      return Number(statB) - Number(statA);
    } catch {
      return 0;
    }
  });

  if (files.length === 0) return null;
  return basename(files[0].name, '.jsonl');
}

// Read ticket from current-ticket.json
function readCurrentTicket(projectDir: string): string | null {
  const ticketPath = join(projectDir, '.claude', 'session', 'current-ticket.json');

  if (!existsSync(ticketPath)) {
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(ticketPath, 'utf-8'));
    return data.ticket || null;
  } catch {
    return null;
  }
}

// Extract text content from a content block or string
function extractText(content: string | ContentBlock[]): string | null {
  if (typeof content === 'string') {
    // Skip meta/system messages
    if (content.includes('<local-command-caveat>') ||
        content.includes('<command-name>') ||
        content.includes('<local-command-stdout>') ||
        content.includes('<system-reminder>')) {
      return null;
    }
    return content.trim();
  }

  if (Array.isArray(content)) {
    const textBlocks = content
      .filter((block): block is ContentBlock & { text: string } =>
        block.type === 'text' && typeof block.text === 'string'
      )
      .map(block => block.text.trim())
      .filter(text => text.length > 0);

    return textBlocks.length > 0 ? textBlocks.join('\n\n') : null;
  }

  return null;
}

// Parse JSONL transcript file
function parseTranscript(filePath: string): TranscriptMessage[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const messages: TranscriptMessage[] = [];

  for (const line of lines) {
    try {
      const entry: JournalEntry = JSON.parse(line);

      // Skip non-message entries
      if (!entry.message || !entry.type) continue;

      // Only process user and assistant messages
      if (entry.type !== 'user' && entry.type !== 'assistant') continue;

      const text = extractText(entry.message.content);
      if (!text) continue;

      messages.push({
        role: entry.type === 'user' ? 'user' : 'claude',
        text,
        timestamp: entry.timestamp || '',
      });
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  return messages;
}

// Format transcript as markdown
function formatTranscript(
  messages: TranscriptMessage[],
  sessionId: string
): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');

  let markdown = `# Session Transcript

**Session:** ${sessionId}
**Date:** ${dateStr}
**Messages:** ${messages.length}

---

`;

  for (const msg of messages) {
    const speaker = msg.role === 'user' ? 'User' : 'Claude';
    markdown += `### ${speaker}\n${msg.text}\n\n---\n\n`;
  }

  return markdown;
}

// Truncate if exceeds max size (50KB)
function truncateIfNeeded(content: string, maxBytes: number = 50000): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);

  if (bytes.length <= maxBytes) {
    return content;
  }

  // Keep header and truncate from the beginning of messages
  const headerEnd = content.indexOf('---\n\n### ');
  if (headerEnd === -1) return content;

  const header = content.slice(0, headerEnd + 5);
  const body = content.slice(headerEnd + 5);

  // Calculate how much to keep
  const headerBytes = encoder.encode(header).length;
  const truncationNote = '\n\n> **Note:** Earlier messages truncated due to size limits.\n\n---\n\n';
  const noteBytes = encoder.encode(truncationNote).length;
  const remainingBytes = maxBytes - headerBytes - noteBytes;

  // Keep the most recent messages (from the end)
  const bodyBytes = encoder.encode(body);
  if (remainingBytes <= 0) {
    return header + truncationNote;
  }

  // Find a good cut point
  const decoder = new TextDecoder();
  const truncatedBody = decoder.decode(bodyBytes.slice(-remainingBytes));

  // Find the next complete message boundary
  const messageStart = truncatedBody.indexOf('### ');
  if (messageStart === -1) {
    return header + truncationNote;
  }

  return header + truncationNote + truncatedBody.slice(messageStart);
}

// Create document in Linear
function createLinearDocument(
  title: string,
  content: string,
  ticket: string,
  projectDir: string
): { documentId: string; url: string } | null {
  const linearTool = join(projectDir, '.claude', 'tools', 'linear-cc', 'src', 'index.ts');

  if (!existsSync(linearTool)) {
    console.error(JSON.stringify({
      success: false,
      error: 'linear-cc tool not found'
    }));
    process.exit(1);
  }

  // Write content to temp file
  const tempFile = '/tmp/transcript-content.md';
  writeFileSync(tempFile, content);

  try {
    const result = execSync(
      `npx tsx "${linearTool}" create-document "${title}" --file "${tempFile}" --issue "${ticket}"`,
      {
        encoding: 'utf-8',
        cwd: projectDir,
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'] // Capture stderr separately
      }
    );

    // Find the JSON line in the output (may have npm warnings before it)
    const lines = result.trim().split('\n');
    const jsonLine = lines.find(line => line.startsWith('{'));

    if (!jsonLine) {
      return null;
    }

    const parsed = JSON.parse(jsonLine);
    if (parsed.success) {
      return {
        documentId: parsed.documentId,
        url: parsed.url
      };
    }
    return null;
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create document'
    }));
    return null;
  }
}

// Main
async function main() {
  const args = parseArgs();
  const projectDir = args.project || process.cwd();

  // Determine session ID
  let sessionId = args.session;
  if (!sessionId) {
    sessionId = findLatestSession(projectDir) || undefined;
  }

  if (!sessionId) {
    console.log(JSON.stringify({
      success: false,
      error: 'No session ID provided and could not auto-detect'
    }));
    process.exit(1);
  }

  // Determine ticket
  let ticket = args.ticket;
  if (!ticket) {
    ticket = readCurrentTicket(projectDir) || undefined;
  }

  if (!ticket) {
    console.log(JSON.stringify({
      success: false,
      error: 'No ticket provided and could not read from current-ticket.json'
    }));
    process.exit(1);
  }

  // Find transcript file
  const projectPath = getProjectPath(projectDir);
  const transcriptPath = join(
    homedir(),
    '.claude',
    'projects',
    projectPath,
    `${sessionId}.jsonl`
  );

  if (!existsSync(transcriptPath)) {
    console.log(JSON.stringify({
      success: false,
      error: `Transcript not found: ${transcriptPath}`
    }));
    process.exit(1);
  }

  // Parse transcript
  const messages = parseTranscript(transcriptPath);

  if (messages.length === 0) {
    console.log(JSON.stringify({
      success: false,
      error: 'No user/assistant messages found in transcript'
    }));
    process.exit(1);
  }

  // Format markdown
  let markdown = formatTranscript(messages, sessionId);
  markdown = truncateIfNeeded(markdown);

  // Create document title
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace('T', ' ');
  const title = `[TRANSCRIPT] ${ticket} ${dateStr}`;

  // Create Linear document
  const result = createLinearDocument(title, markdown, ticket, projectDir);

  if (result) {
    console.log(JSON.stringify({
      success: true,
      documentId: result.documentId,
      url: result.url,
      messageCount: messages.length
    }));
  } else {
    console.log(JSON.stringify({
      success: false,
      error: 'Failed to create Linear document'
    }));
    process.exit(1);
  }
}

main().catch(error => {
  console.log(JSON.stringify({
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  }));
  process.exit(1);
});
