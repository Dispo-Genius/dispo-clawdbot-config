# Tool Patterns

Patterns for building `-cc` CLI tools with Commander.js.

## Directory Structure

```
~/.claude/tools/[name]-cc/
├── package.json
├── tsconfig.json          # Optional, tsx handles TS
└── src/
    ├── index.ts           # Entry point, Commander setup
    ├── types.ts           # TypeScript types
    ├── utils/
    │   ├── output.ts      # TOON formatting
    │   └── [service].ts   # Service-specific helpers (git.ts, api.ts)
    └── commands/
        ├── status.ts
        ├── list.ts
        └── create.ts
```

## package.json

```json
{
  "name": "my-tool-cc",
  "version": "1.0.0",
  "description": "My Tool CLI wrapper for Claude Code",
  "main": "src/index.ts",
  "scripts": {
    "start": "tsx src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Entry Point (index.ts)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { setGlobalFormat } from './utils/output';
import type { OutputFormat } from './types';

// Import commands
import { status } from './commands/status';
import { list } from './commands/list';

const program = new Command();

program
  .name('my-tool-cc')
  .description('My Tool CLI wrapper for Claude Code')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: compact (default), json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });

// Register commands
program.addCommand(status);
program.addCommand(list);

program.parse(process.argv);
```

## Command Pattern

```typescript
// commands/status.ts
import { Command } from 'commander';
import { formatStatus, output, errorOutput } from '../utils/output';
import { getStatus, isValid } from '../utils/service';

export const status = new Command('status')
  .description('One-line status summary')
  .option('--verbose', 'Show detailed output')
  .action((options) => {
    try {
      if (!isValid()) {
        errorOutput('not configured');
      }

      const result = getStatus();
      output(formatStatus(result, options.verbose));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
```

## Types Pattern

```typescript
// types.ts

// Domain types
export interface StatusResult {
  status: 'ok' | 'error';
  message: string;
  items: Item[];
}

export interface Item {
  id: string;
  name: string;
  state: 'active' | 'inactive';
}

// Output format
export type OutputFormat = 'compact' | 'json';
```

## Service Wrapper Pattern

For CLI wrappers (like git):

```typescript
// utils/git.ts
import { execSync } from 'child_process';

export function exec(args: string, options: { throwOnError?: boolean } = {}): string {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (options.throwOnError !== false) {
      const msg = error instanceof Error
        ? (error as { stderr?: string }).stderr || error.message
        : 'Unknown error';
      throw new Error(msg);
    }
    return '';
  }
}
```

For API wrappers:

```typescript
// utils/api.ts
export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

## Output Utilities

See [TOON Format](toon-format.md) for full output.ts implementation.

Key functions:
- `formatArray()` - TOON array with header
- `formatSingle()` - Single-line result
- `output()` - Print to stdout
- `errorOutput()` - Print error and exit

## Invocation

All services are invoked via `gateway-cc exec`:

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github status
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-list
npx tsx ~/.claude/tools/linear-cc/src/index.ts get-issue DIS-123
```

## Common Commands

| Pattern | Purpose | Example |
|---------|---------|---------|
| `status` | Current state | `gateway-cc exec github status` |
| `list` | List items | `gateway-cc exec github pr-list` |
| `view` | Single item details | `gateway-cc exec github pr-view 123` |
| `create` | Create new item | `gateway-cc exec github pr-create` |
| `sync` | Sync with remote | `gateway-cc exec github sync` |

## Error Handling

```typescript
try {
  // ... operation
} catch (error) {
  // Use errorOutput for consistent TOON error format
  errorOutput(error instanceof Error ? error.message : 'Unknown error');
}
```

Output:
```
error:not a git repository
```

## Testing

```bash
# Install deps
cd ~/.claude/tools/my-tool-cc && npm install

# Test commands
npx tsx src/index.ts status
npx tsx src/index.ts list --format json
```
