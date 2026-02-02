/**
 * TOON format output utilities
 */

function escapeField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('|')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Format single credential: name|username|password
 */
export function formatCredential(name: string, username: string, password: string): string {
  return `${escapeField(name)}|${escapeField(username)}|${escapeField(password)}`;
}

/**
 * Format item list with TOON header
 */
export function formatItemList(items: Array<{ name: string; username: string; updated: string }>): string {
  if (items.length === 0) {
    return 'items[0]{name|username|updated}:';
  }

  const header = `items[${items.length}]{name|username|updated}:`;
  const rows = items.map(item =>
    `${escapeField(item.name)}|${escapeField(item.username)}|${item.updated}`
  );
  return [header, ...rows].join('\n');
}

/**
 * Format success result
 */
export function formatSuccess(action: string, target: string): string {
  return `${action}:${target}`;
}

/**
 * Format error and exit
 */
export function errorOutput(message: string): never {
  console.log(`error:${message}`);
  process.exit(1);
}

/**
 * Standard output
 */
export function output(data: string): void {
  console.log(data);
}
