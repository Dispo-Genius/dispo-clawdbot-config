# diagram-cc

CLI reference for `diagram-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `get` | Get a node by ID |
| `search` | Search for nodes by query |
| `tree` | Display diagram tree structure |
| `path` | Show path from root to a node |
| `trace` | Trace node connections via edges |
| `create` | Create a new node |
| `create-diagram` | Create a new top-level diagram |
| `update` | Update an existing node |
| `delete` | Delete a node (must have no children) |
| `move` | Move a node to a new parent |
| `connect` | Create an edge between two nodes |
| `disconnect` | Remove an edge between two nodes |
| `layout` | Calculate and apply layout positions to diagram nodes |

---

## get

Get a node by ID

```bash
diagram-cc get [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `--with-docs` | No | Include documentation content if available |
| `--with-children` | No | Include child nodes |

---

## search

Search for nodes by query

```bash
diagram-cc search [options] <query>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search query (matches title, description, or ID) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-t, --type <type>` | Yes | Filter by node type |
| `-s, --status <status>` | Yes | Filter by status |
| `--limit <n>` | No | Limit results (default: 20) |

---

## tree

Display diagram tree structure

```bash
diagram-cc tree [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-r, --root <id>` | Yes | Start from specific node ID |
| `--depth <n>` | No | Maximum depth to display (default: Infinity) |

---

## path

Show path from root to a node

```bash
diagram-cc path [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-v, --verbose` | No | Show full node details for each step |

---

## trace

Trace node connections via edges

```bash
diagram-cc trace [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `--direction <dir>` | Yes | Direction: upstream, downstream, or both (default: |

---

## create

Create a new node

```bash
diagram-cc create [options] <type> <title>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `type` | Yes | Node type (use "types" to list all) |
| `title` | Yes | Node title |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-p, --parent <id>` | Yes | Parent node ID (required) |
| `--id <id>` | Yes | Override auto-generated ID |
| `-s, --status <status>` | Yes | Override default status |
| `--desc <description>` | Yes | Node description |
| `--docs <path>` | Yes | Documentation path |
| `--linear <issues>` | Yes | Linear issue IDs (comma-separated) |
| `--code <files>` | Yes | Code file paths (comma-separated) |
| `--dry-run` | No | Show what would be created without saving |

---

## create-diagram

Create a new top-level diagram

```bash
diagram-cc create-diagram [options] <title>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Diagram title |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--id <id>` | Yes | Override auto-generated ID |
| `--desc <description>` | Yes | Diagram description |
| `--dry-run` | No | Show what would be created without saving |

---

## update

Update an existing node

```bash
diagram-cc update [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-t, --title <title>` | Yes | New title |
| `-s, --status <status>` | Yes | New status |
| `--desc <description>` | Yes | New description |
| `--docs <path>` | Yes | Documentation path |
| `--linear <issues>` | Yes | Linear issue IDs (comma-separated, replaces |
| `--add-linear <issues>` | Yes | Add Linear issue IDs (comma-separated) |
| `--code <files>` | Yes | Code file paths (comma-separated, replaces existing) |
| `--add-code <files>` | Yes | Add code file paths (comma-separated) |
| `--data <json>` | Yes | Data object (JSON, replaces existing) |
| `--dry-run` | No | Show what would be updated without saving |

---

## delete

Delete a node (must have no children)

```bash
diagram-cc delete [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `--force` | No | Skip confirmation |
| `--dry-run` | No | Show what would be deleted without saving |

---

## move

Move a node to a new parent

```bash
diagram-cc move [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Node ID to move |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--to <parentId>` | Yes | New parent node ID |
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `--dry-run` | No | Show what would be moved without saving |

---

## connect

Create an edge between two nodes

```bash
diagram-cc connect [options] <source> <target>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `source` | Yes | Source node ID |
| `target` | Yes | Target node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-l, --label <label>` | Yes | Edge label |
| `--dry-run` | No | Show what would be created without saving |

---

## disconnect

Remove an edge between two nodes

```bash
diagram-cc disconnect [options] <source> <target>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `source` | Yes | Source node ID |
| `target` | Yes | Target node ID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `--dry-run` | No | Show what would be removed without saving |

---

## layout

Calculate and apply layout positions to diagram nodes

```bash
diagram-cc layout [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-d, --diagram <diagram>` | No | Diagram ID (default: investor-prospecting) |
| `-p, --parent <nodeId>` | Yes | Layout only the subtree under this node |
| `--all` | No | Layout all nodes in the diagram |
| `--direction <dir>` | Yes | Layout direction: TB (top-bottom) or LR (left-right) |
| `--dry-run` | No | Show positions without saving |

---
