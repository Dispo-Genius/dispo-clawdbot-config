# Config Rules

Standards for settings.json, settings.local.json, and hooks.

## settings.json

Project-wide settings (committed to repo):

```json
{
  "statusLine": {
    "format": "Working on {{task}} | {{file}} | Context: {{context}}%"
  }
}
```

| Setting | Purpose | Required |
|---------|---------|----------|
| statusLine | Visual feedback in terminal | Recommended |
| permissions | Default tool permissions | Optional |

## settings.local.json

Local/sensitive settings (gitignored):

| Section | Contents |
|---------|----------|
| permissions | Per-tool allow/deny rules |
| hooks | Pre/post tool hooks |
| mcpServers | MCP configurations |

**Never commit:** API keys, tokens, personal paths

## Hooks

### TypeScript Check Hook

```json
{
  "PostToolUse": [
    {
      "event": "Write|Edit",
      "command": "npm run typecheck --silent 2>&1 | head -20",
      "blocking": true
    }
  ]
}
```

| Field | Purpose |
|-------|---------|
| event | Tool names (pipe-separated) |
| command | Shell command to run |
| blocking | If true, blocks on failure |

### Context Watcher Hook

```json
{
  "PostToolUse": [
    {
      "event": "*",
      "command": "node .claude/scripts/context-watcher.js",
      "blocking": false
    }
  ]
}
```

### Write Blocker Hook (Protected Directories)

Block writes to protected files/directories:

```json
{
  "PreToolUse": [
    {
      "event": "Write|Edit",
      "command": "node .claude/hooks/check-protected.js \"$TOOL_INPUT\"",
      "blocking": true
    }
  ]
}
```

**check-protected.js example:**
```javascript
const input = JSON.parse(process.argv[2]);
const protectedPaths = [
  '.claude/skills/building-ui/tokens/',
  '.env'
];
const filePath = input.file_path || input.path;
if (protectedPaths.some(p => filePath.includes(p))) {
  console.error(`BLOCKED: ${filePath} is protected`);
  process.exit(1);
}
```

### Lint Hook (Post-Edit)

Run linter after code changes (non-blocking):

```json
{
  "PostToolUse": [
    {
      "event": "Write|Edit",
      "command": "npx eslint --fix \"$FILE_PATH\" 2>&1 | head -10",
      "blocking": false
    }
  ]
}
```

**Notes:**
- Non-blocking to avoid halting on lint errors
- `--fix` auto-corrects simple issues
- `head -10` limits output noise

### Sandboxing Alternative

Instead of permission allowlists, enable sandboxing:

```json
{
  "permissions": {
    "Bash": {
      "sandbox": true
    }
  }
}
```

Sandboxing restricts Bash to safe operations without maintaining explicit allowlists.

## Security Rules

| Rule | Check | Fix |
|------|-------|-----|
| No secrets in config | settings*.json has no API keys | Move to env vars |
| Deny rules for .env | Can't read .env files | Add deny permission |
| Deny rules for secrets/ | Can't read secrets dir | Add deny permission |

Example deny rules:
```json
{
  "permissions": {
    "Read": {
      "deny": [".env*", ".claude/secrets/*", ".mcp.json"]
    }
  }
}
```

## Recommended Hooks

| Hook | Purpose | Priority |
|------|---------|----------|
| TypeScript check | Catch type errors early | Critical |
| Context watcher | Alert on high usage | High |
| Lint check | Maintain code style | Medium |
| Test runner | Verify changes | Medium |

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No statusLine | No visual feedback | Add statusLine config |
| No hooks | Missing guardrails | Add TypeScript hook minimum |
| Secrets in config | Security risk | Move to env vars |
| Blocking lint hook | Slows iteration | Make non-blocking or remove |
| Too many hooks | Performance drag | Consolidate or prioritize |

## File Locations

| File | Location | Committed |
|------|----------|-----------|
| settings.json | .claude/settings.json | Yes |
| settings.local.json | .claude/settings.local.json | No |
| hooks/ | .claude/hooks/ | Depends |
