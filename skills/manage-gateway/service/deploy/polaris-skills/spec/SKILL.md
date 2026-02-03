---
name: spec
description: Specification file management. List, view, and check spec status. Triggers on "spec", "specs", "specification", "spec status", "list specs".
metadata: {"clawdbot":{"emoji":"📝","requires":{"env":[]}}}
---

# Spec Integration

Use the `spec` service via gateway-cc for spec file operations.

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec <command> [options]
```

## Commands

### list
List all spec files.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec list

# Options
--status <status>   Filter by status (draft, in-progress, complete)
--limit <n>         Max results
```

### info
Get spec file details.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec info <spec-name>

# Example
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec info polaris-remote-gateway
```

### status
Show spec completion status.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec status <spec-name>
```

### index
Rebuild spec index.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec index
```

### restructure
Reorganize spec structure.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec spec restructure <spec-name>
```

## Response Format

**Success:**
```json
{"success": true, "specs": [...]}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```

## Spec Statuses
- draft - Initial draft, not started
- in-progress - Work underway
- complete - All criteria met
