# Hook Patterns

Reference for creating Claude Code hooks.

## Hook Types

| Type | Timing | Use Case |
|------|--------|----------|
| Pre-tool | Before tool executes | Validation, blocking, modification |
| Post-tool | After tool completes | Logging, cleanup, notifications |

## File Formats

Hooks can be `.mjs` (JavaScript) or `.sh` (shell script).

### JavaScript (.mjs)

```javascript
// ~/.claude/hooks/pre-edit.mjs
const input = JSON.parse(process.argv[2]);

// Access hook context
const { tool, input: toolInput, output } = input;

// Return JSON for modifications or decisions
console.log(JSON.stringify({
  decision: 'allow', // or 'block'
  message: 'Optional message to display'
}));
```

### Shell Script (.sh)

```bash
#!/bin/bash
# ~/.claude/hooks/post-commit.sh

# Hook input comes as JSON argument
INPUT="$1"

# Parse with jq
TOOL=$(echo "$INPUT" | jq -r '.tool')

# Exit 0 = success, non-zero = failure
exit 0
```

## Registration in settings.json

Hooks are registered in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "pre": {
      "Edit": ["~/.claude/hooks/pre-edit.mjs"],
      "Write": ["~/.claude/hooks/pre-write.mjs"]
    },
    "post": {
      "Bash": ["~/.claude/hooks/post-bash.sh"]
    }
  }
}
```

## Hook Input Format

```typescript
interface HookInput {
  tool: string;           // Tool name (e.g., "Edit", "Bash")
  input: Record<string, unknown>;  // Tool input parameters
  output?: string;        // Tool output (post-hooks only)
  cwd: string;            // Current working directory
  timestamp: string;      // ISO timestamp
}
```

## Common Patterns

### Validation Hook

Block operations that don't meet criteria:

```javascript
// pre-edit.mjs - Block edits to protected files
const input = JSON.parse(process.argv[2]);
const protectedPaths = ['.env', 'credentials.json'];

const isProtected = protectedPaths.some(p =>
  input.input.file_path?.includes(p)
);

console.log(JSON.stringify({
  decision: isProtected ? 'block' : 'allow',
  message: isProtected ? 'Cannot edit protected files' : undefined
}));
```

### Logging Hook

Record operations for audit:

```javascript
// post-bash.mjs - Log all bash commands
import fs from 'fs';

const input = JSON.parse(process.argv[2]);
const logEntry = {
  timestamp: input.timestamp,
  command: input.input.command,
  cwd: input.cwd
};

fs.appendFileSync(
  `${process.env.HOME}/.claude/logs/bash.jsonl`,
  JSON.stringify(logEntry) + '\n'
);

console.log(JSON.stringify({ decision: 'allow' }));
```

### Transform Hook

Modify tool input before execution:

```javascript
// pre-bash.mjs - Auto-prefix npm commands with timeout
const input = JSON.parse(process.argv[2]);
const cmd = input.input.command;

if (cmd.startsWith('npm ') && !cmd.includes('timeout')) {
  console.log(JSON.stringify({
    decision: 'allow',
    modifiedInput: {
      ...input.input,
      command: `timeout 300 ${cmd}`
    }
  }));
} else {
  console.log(JSON.stringify({ decision: 'allow' }));
}
```

## Best Practices

1. **Fast execution** - Hooks run synchronously; keep them quick
2. **Clear messages** - When blocking, explain why
3. **Fail safe** - On errors, default to allowing (or blocking for security hooks)
4. **Idempotent** - Hooks may run multiple times
5. **No side effects** - Pre-hooks shouldn't modify external state

## Debugging

Test hooks manually:

```bash
# Test a hook with sample input
echo '{"tool":"Edit","input":{"file_path":"/tmp/test.txt"},"cwd":"/tmp"}' | \
  node ~/.claude/hooks/pre-edit.mjs
```

Check Claude Code logs for hook execution:

```bash
tail -f ~/.claude/logs/hooks.log
```
