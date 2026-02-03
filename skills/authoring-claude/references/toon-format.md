# TOON Format Specification

Token-Oriented Object Notation - compact, human-readable format optimized for LLM consumption.

## Why TOON

- **40-65% fewer tokens** than JSON
- **Higher parsing accuracy** (73.9% vs 69.7% for structured extraction)
- **Ideal for uniform arrays** of records
- **Human-readable** while being machine-parseable

## When to Use

Use TOON in `-cc` tools when outputting:
- Lists of items (PRs, files, issues)
- Status summaries
- Mutation results

## Syntax

### Arrays with Headers

```
name[count]{field1,field2,field3}:
value1,value2,value3
value4,value5,value6
```

Example - PR list:
```
prs[3]{num,title,author,status}:
42,Fix login bug,alice,open
43,Add dark mode,bob,merged
44,Update deps,charlie,open
```

Example - Conflicts:
```
conflicts[2]{file,lines}:
src/auth.ts,15;23;31
lib/utils.ts,8;12
```

### Single Items

```
type:field1,field2,field3
```

Examples:
```
status:clean
status:andy,staged[1],modified[4]
diff{+,-,files}:+23,-10,5
error:not a git repository
pr:42,open,alice→main,approved
```

### Mutations (Create/Update Results)

```
Action: key1:val1 | key2:val2
```

Examples:
```
Created: pr:#45 | url:github.com/org/repo/pull/45
Staged: files:3 | added:src/auth.ts,src/utils.ts,README.md
```

## Field Escaping

Fields containing commas or quotes need escaping:

```typescript
function escapeField(val: string): string {
  if (val.includes(',') || val.includes('"')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
```

Example:
```
files[2]{name,message}:
auth.ts,"Fix login, add validation"
utils.ts,"Update ""quoted"" string"
```

## Implementation Pattern

See `~/.claude/skills/manage-github/service/src/utils/output.ts` for reference implementation.

### Core Functions

```typescript
// utils/output.ts
import type { OutputFormat } from '../types';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getFormat(): OutputFormat {
  return globalFormat;
}

// Format array with TOON header
export function formatArray<T>(
  name: string,
  items: T[],
  fields: (keyof T)[]
): string {
  if (getFormat() === 'json') {
    return JSON.stringify(items, null, 2);
  }

  const header = `${name}[${items.length}]{${fields.join(',')}}:`;
  const rows = items.map(item =>
    fields.map(f => escapeField(String(item[f]))).join(',')
  );
  return [header, ...rows].join('\n');
}

// Format single-line result
export function formatSingle(type: string, ...values: string[]): string {
  return `${type}:${values.join(',')}`;
}

// Standard output
export function output(data: string): void {
  console.log(data);
}

// Error with exit
export function errorOutput(error: string): never {
  console.log(`error:${error}`);
  process.exit(1);
}
```

### Format Flag

All `-cc` tools support a `--format` flag:

```typescript
program
  .option('-f, --format <format>', 'Output format: compact (default), json', 'compact')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format && ['compact', 'json'].includes(opts.format)) {
      setGlobalFormat(opts.format as OutputFormat);
    }
  });
```

## Real Examples

### gateway-cc exec github status

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github status
# → status:andy,staged[1],modified[4]

npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github status --format json
# → { "branch": "andy", "staged": [...], ... }
```

### gateway-cc exec github diff

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github diff --stat
# → diff{+,-,files}:+23,-10,5
```

### gateway-cc exec github conflicts

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github conflicts
# → conflicts[0]{}:
# or
# → conflicts[2]{file,lines}:
#   src/auth.ts,15;23;31
#   lib/utils.ts,8;12
```

## Sources

- [TOON GitHub](https://github.com/toon-format/toon)
- [TOON Guide](https://jsontotable.org/toon-format)
