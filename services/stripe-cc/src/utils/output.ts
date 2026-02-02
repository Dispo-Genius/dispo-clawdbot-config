export type OutputFormat = 'json' | 'table' | 'compact';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getGlobalFormat(): OutputFormat {
  return globalFormat;
}

/**
 * Output data in the configured format.
 */
export function output(data: unknown): void {
  const format = getGlobalFormat();

  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('No results');
      return;
    }

    if (format === 'table') {
      console.table(data);
    } else {
      // Compact format
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          const parts: string[] = [];
          for (const [key, value] of Object.entries(item)) {
            if (value !== null && value !== undefined && value !== '') {
              parts.push(`${key}=${value}`);
            }
          }
          console.log(parts.join('  '));
        } else {
          console.log(item);
        }
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    if (format === 'table') {
      console.table([data]);
    } else {
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          console.log(`${key}: ${value}`);
        }
      }
    }
  } else {
    console.log(data);
  }
}

/**
 * Output success message.
 */
export function success(message: string): void {
  console.log(`OK: ${message}`);
}

/**
 * Output error message and exit.
 */
export function error(message: string, exitCode: number = 1): never {
  console.error(`ERROR: ${message}`);
  process.exit(exitCode);
}
