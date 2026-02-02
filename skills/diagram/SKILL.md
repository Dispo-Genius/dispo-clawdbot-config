---
name: manage-diagram
description: Manage system diagrams via CLI. Triggers on "diagram", "system diagram", "list diagrams", "diagram nodes", "diagram tree", "update diagram from prototype", "push finding to diagram", "sync discovery to diagram".
metadata: {"clawdbot":{"emoji":"📊"}}
---

# Diagram Skill

Use the `diagram` service via gateway-cc for all diagram operations.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram <command> [options]
```

<instructions>
## When to Use

- Viewing system architecture diagrams
- Adding/updating/deleting nodes and edges
- Creating new diagrams from natural language descriptions
- Auto-layouting diagrams after structural changes

## Workflow: Zapier-Pattern (Text-First)

All diagram work follows: **describe -> create -> connect -> layout**

No canvas UI exists. Diagrams are structure-derived: positions always computed from topology, never manually placed.

### Step 1: Create Nodes
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram create <type> "<title>" -d <diagram> --parent <parentId>
```

### Step 2: Connect Nodes (create edges)
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram connect <sourceId> <targetId> -d <diagram> --label "edge label"
```

### Step 3: Layout (always run after structural changes)
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram layout -d <diagram>
```

Layout computes positions from graph structure. Run after any create/connect/delete/move operation.

## Writing Style

Write diagram nodes like sticky notes on a whiteboard: **short label on top, full spec underneath.**

### Title Rules
- **2–4 words max** — a sticky-note label, not a sentence
- Plain English, no code, no jargon
- Action verbs for processes: "Duplicate Check", "Tag Entities"
- Question form for decisions: "ID Exists?", "Valid Response?"
- Noun phrases for containers: "Creation Flow", "Entity Enrichment"

### Good vs Bad Titles

| Bad (too verbose / technical) | Good (concise label) |
|---|---|
| `POST /api/reapi/autocomplete` | `REAPI Autocomplete` |
| `Execute fuzzy match algorithm on entity names` | `Duplicate Check` |
| `Check if property.price_history.length > 0` | `Price History Exists?` |
| `Transform raw REAPI response to canonical schema` | `Standardize Data` |
| `Route to B-B1a enrichment queue via Redis` | `Send to B-B1a` |

### Description = the Full Spec

All business logic, rules, thresholds, and implementation details live in the description:
- What the module does
- Business rules ("fuzzy match at 90% threshold")
- Percentages, thresholds, batch sizes
- DB table names, API endpoints
- Edge cases, error handling
- Any context needed to implement

**Example:**
- **Title:** `Duplicate Check`
- **Description:** `Compare incoming entity against existing records using Jaro-Winkler similarity. Match threshold: 90% on name + exact state match. If multiple matches found, pick highest confidence score. Skip if entity has verified InvestorID.`

## Node Type Inference Guide

When a user describes a system in natural language, infer node types:

| User describes | Node type |
|---|---|
| "check if", "does it exist?", "which type?" | `decision` |
| "call API", "search service", "fetch from" | `api-call` |
| "check DB", "look up", "insert into", "save" | `database` |
| "when new data arrives", "on trigger" | `trigger` |
| "clean up", "standardize", "reformat" | `transform` |
| "send to queue", "route to", "proceed to" | `queue` |
| "AI classifies", "LLM fallback", "agent" | `ai-agent` |
| "tag as", "divide", "de-duplicate", "run" | `process` |
| "jump to", "go back to" | `goto` |
| top-level system | `system` |
| major subsystem | `subsystem` |
| named sequence of steps | `flow` |
| internal module | `component` |
| third-party service | `external` |

## Edge Label Conventions

### Condition Labels (decision branches — always label both sides)

| Pattern | Examples |
|---|---|
| existence | `Exists` / `Doesn't exist` |
| boolean | `True` / `False` |
| validity | `Valid` / `Invalid` |
| search | `Found` / `Not found` |
| threshold | `Passes` / `Fails` |

### Flow Labels (non-decision, describe the payload)

`property data`, `merged records`, `standardized data`

### Rules
- 1–4 words max
- Omit when flow is obvious (one output, sequential)
- Always label both decision branches

## Tool Reference

```bash
# Tree view of entire diagram
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram tree -d investor-prospecting

# Get specific node details
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram get B-A1b -d investor-prospecting

# Search for nodes
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram search "property" -d investor-prospecting

# Trace path from root to node
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram trace B-A1a-5 -d investor-prospecting

# Create a new node
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram create <type> "<title>" -d investor-prospecting --parent <parentId>

# Update node
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram update <nodeId> -d investor-prospecting --title "New Title"

# Delete node
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram delete <nodeId> -d investor-prospecting

# Connect nodes (create edge)
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram connect <sourceId> <targetId> -d investor-prospecting

# Disconnect nodes (remove edge)
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram disconnect <sourceId> <targetId> -d investor-prospecting

# Move node to new parent
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram move <nodeId> <newParentId> -d investor-prospecting

# Layout entire diagram (run after any structural change)
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram layout -d investor-prospecting

# Layout subtree only
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram layout -d investor-prospecting --root <nodeId>

# Preview layout without saving
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram layout -d investor-prospecting --dry-run
```

## Node Types

| Type | Description |
|------|-------------|
| system | Top-level system |
| subsystem | Major subsystem |
| flow | Process flow |
| process | Processing step |
| api-call | External API call |
| database | Database operation |
| decision | Decision point |
| trigger | Event trigger |
| transform | Data transformation |
| ai-agent | AI/LLM operation |
| queue | Queue/routing |
| component | Internal module |
| external | Third-party service |
| goto | Jump/redirect |

## Status Values

| Status | Description |
|--------|-------------|
| active | Currently implemented |
| planned | Planned, not yet built |
| in-progress | Currently being built |
| deprecated | Scheduled for removal |

## Prototype Discovery Workflow

When updating the diagram based on R&D discoveries:

### Step 1: Identify Discovery Source
Read the source file (spec, experiment result, or architecture doc):
- `.claude/specs/*.md` - Algorithm/architecture specs
- `scripts/*_results.json` - Experiment results
- `docs/models/*.md` - Architecture documentation

### Step 2: Map to Diagram Nodes
Use keyword matching to find affected nodes:
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram search "{keyword}" -d investor-prospecting
```

### Step 3: Update Node
Add discovery info to node's `data` field:
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram update {nodeId} -d investor-prospecting \
  --data '{"edgeCases": [...], "prototypeSource": "spec-name.md"}'
```

### Step 4: Re-layout
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram layout -d investor-prospecting
```
</instructions>

---

<references>
## Diagram Data Location

Diagrams are stored in `public/data/diagrams/`:
- `index.json` - Registry of all diagrams
- `<diagram-id>/` - Folder-based diagrams with node files

## Related Skills

| Skill | When |
|-------|------|
| `/manage-linear` | Link issues to diagram nodes |
</references>
