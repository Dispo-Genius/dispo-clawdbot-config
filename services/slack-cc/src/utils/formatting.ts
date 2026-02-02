/**
 * Convert standard Markdown to Slack's mrkdwn format
 *
 * Conversions:
 * - **bold** → *bold*
 * - [text](url) → <url|text>
 * - Preserves code blocks and inline code
 * - Preserves existing Slack mentions (<@U123>)
 */
export function markdownToMrkdwn(text: string): string {
  if (!text?.trim()) return text;

  // Preserve code blocks and inline code
  const codeBlocks: string[] = [];
  let result = text.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });
  result = result.replace(/`[^`]+`/g, (m) => {
    codeBlocks.push(m);
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  // Convert **bold** → *bold*
  result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  // Convert [text](url) → <url|text>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // Restore code blocks
  return result.replace(/\x00CB(\d+)\x00/g, (_, i) => codeBlocks[+i]);
}
