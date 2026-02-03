---
name: diagram
description: System diagram management. Create, update, and navigate architectural diagrams. Triggers on "diagram", "system diagram", "architecture", "diagram nodes", "diagram tree".
metadata: {"clawdbot":{"emoji":"🗺️","requires":{"env":[]}}}
---

# Diagram Integration

Use the `diagram` service via gateway-cc for all diagram operations.

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram <command> [options]
```

## Commands

### tree
Show diagram as tree structure.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram tree -d <diagram-name>

# Options
-d, --diagram <name>    Diagram name (required)
--depth <n>             Max depth to display

# Example
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram tree -d investor-prospecting
```

### get
Get node details.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram get <node-id> -d <diagram-name>
```

### create
Create a new node.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram create -d <diagram-name> \
  --name "Node Name" \
  --type component \
  --parent <parent-id>

# Options
--name <name>       Node name (required)
--type <type>       Node type: system, component, service, database, external
--parent <id>       Parent node ID
--description <text>
```

### update
Update a node.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram update <node-id> -d <diagram-name> \
  --name "New Name" \
  --description "Updated description"
```

### delete
Delete a node.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram delete <node-id> -d <diagram-name>
```

### connect
Create a connection between nodes.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram connect <source-id> <target-id> -d <diagram-name> \
  --label "connection label"
```

### disconnect
Remove a connection.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram disconnect <source-id> <target-id> -d <diagram-name>
```

### search
Search nodes by name or description.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram search "query" -d <diagram-name>
```

### path
Find path between nodes.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram path <source-id> <target-id> -d <diagram-name>
```

### trace
Trace data flow through the system.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram trace <start-id> -d <diagram-name>

# Options
--direction <dir>   upstream or downstream (default: downstream)
```

### layout
Auto-layout diagram nodes.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram layout -d <diagram-name>
```

### create-diagram
Create a new diagram.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec diagram create-diagram <name> --description "Description"
```

## Node Types
- system - Top-level system boundary
- component - Major component
- service - Service/module
- database - Data store
- external - External system

## Response Format

**Success:**
```json
{"success": true, "node": {...}}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```
