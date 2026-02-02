# Updating CLAUDE.md

When adding new extensions, update CLAUDE.md to register them.

## Tool Registration

### 1. Add to Tool Preferences Table

```markdown
| Service | Tool | NEVER use |
|---------|------|-----------|
| Git | `gateway-cc exec github` | Raw `git status`, `git diff`, `git rebase` |
| GitHub | `gateway-cc exec github` | `gh` CLI, raw API calls, WebFetch |
| Linear | `linear-cc` | Raw API calls, WebFetch |
```

### 2. Add Command Examples

```bash
# Git/GitHub (via gateway-cc)
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github status
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github diff --stat
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github pr-list
```

## Skill Registration

Add to Skills table:

```markdown
| Skill | When |
|-------|------|
| `/authoring-claude` | Creating tools, skills, agents |
| `/building-ui` | UI work |
| `/commit` | Commit and push |
```

## Agent Registration

If adding a subagent type, document in appropriate section or add new section.

## Checklist

### For Tools
- [ ] Added to Tool Preferences table
- [ ] Listed what NOT to use (raw commands, etc.)
- [ ] Added command examples with full paths
- [ ] Verified invocation syntax works

### For Skills
- [ ] Added to Skills table with trigger description
- [ ] Verified skill triggers work

### For Agents
- [ ] Documented agent purpose
- [ ] Added to any relevant sections

## Example: Adding a gateway-cc service

Before:
```markdown
## Tool Preferences

| Service | Tool | NEVER use |
|---------|------|-----------|
| Linear | `linear-cc` | Raw API calls |
```

After:
```markdown
## Tool Preferences

| Service | Tool | NEVER use |
|---------|------|-----------|
| Linear | `linear-cc` | Raw API calls |
| Git/GitHub | `gateway-cc exec github` | Raw `git`, `gh` CLI |

```bash
# Git/GitHub
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github status
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github diff --stat
```
```

## Location

CLAUDE.md is typically at: `<project>/.claude/CLAUDE.md`

For project-specific tools, register there. For user-wide tools, may need `~/.claude/CLAUDE.md` if it exists.
