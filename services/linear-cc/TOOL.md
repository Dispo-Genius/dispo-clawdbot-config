# linear-cc

CLI reference for `linear-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `sync` | Sync team configuration from Linear API |
| `create-issue` | Create a new Linear issue |
| `create-project` | Create a new Linear project |
| `get-issue` | Get details of a Linear issue |
| `update-status` | Update the status of a Linear issue |
| `update-issue` | Update a Linear issue |
| `create-comment` | Create a comment on a Linear issue |
| `create-document` | Create a document in Linear, optionally attached to an issue or project |
| `list-issues` | List Linear issues with filters |
| `search-issues` | Search issues by text query (title contains, case insensitive) |
| `list-projects` | List available Linear projects from cache |
| `list-comments` | List comments on a Linear issue |
| `list-documents` | List documents attached to a Linear issue |
| `get-document` | Get a document by ID or by searching issue documents by title pattern |
| `update-document` | Update an existing Linear document |
| `upload-attachment` | Upload a file attachment to a Linear issue (stub - upload not yet implemented) |
| `log-experiment` | Log an experiment result to Linear with sub-issue and document update |

---

## sync

Sync team configuration from Linear API

```bash
linear-cc sync [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--team <id>` | Yes | Team ID to sync (default: |

---

## create-issue

Create a new Linear issue

```bash
linear-cc create-issue [options] <title>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Issue title |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--label <label>` | Yes | Label name (e.g., feature, bug) |
| `--project <project>` | Yes | Project name |
| `--assignee <assignee>` | Yes | Assignee name |
| `--unassigned` | No | Leave issue unassigned (default: assign to |
| `--description <description>` | Yes | Issue description |
| `--priority <priority>` | Yes | Priority (1=urgent, 2=high, 3=medium, 4=low) |

---

## create-project

Create a new Linear project

```bash
linear-cc create-project [options] <name>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Project name |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--description <description>` | Yes | Project description |

---

## get-issue

Get details of a Linear issue

```bash
linear-cc get-issue [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Issue identifier (DIS-47) or UUID |

---

## update-status

Update the status of a Linear issue

```bash
linear-cc update-status [options] <id> <status>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Issue identifier (DIS-47) or UUID |
| `status` | Yes | New status (backlog, todo, in-progress, in-review, done, |

---

## update-issue

Update a Linear issue

```bash
linear-cc update-issue [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Issue identifier (e.g., DIS-47) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--project <project>` | Yes | Project name |
| `--milestone <milestone>` | Yes | Milestone name (format: "Project:Milestone") |
| `--assignee <assignee>` | Yes | Assignee name |
| `--priority <priority>` | Yes | Priority (1=urgent, 2=high, 3=medium, 4=low) |
| `--due <date>` | Yes | Due date (YYYY-MM-DD format) |
| `--description <text>` | Yes | Issue description (markdown) |

---

## create-comment

Create a comment on a Linear issue

```bash
linear-cc create-comment [options] <id> [body]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Issue identifier (DIS-47) or UUID |
| `body` | Yes | Comment body text |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--file <path>` | Yes | Read comment body from file |

---

## create-document

Create a document in Linear, optionally attached to an issue or project

```bash
linear-cc create-document [options] <title> [content]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `title` | Yes | Document title |
| `content` | Yes | Document content (markdown) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--file <path>` | Yes | Read content from file |
| `--issue <id>` | Yes | Attach to issue (identifier like PRO-123 or UUID) |
| `--project <id>` | Yes | Attach to project (UUID) |

---

## list-issues

List Linear issues with filters

```bash
linear-cc list-issues [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--status <status>` | Yes | Filter by status |
| `--label <label>` | Yes | Filter by label |
| `--project <project>` | Yes | Filter by project |
| `--assignee <assignee>` | Yes | Filter by assignee |
| `--limit <limit>` | No | Max issues to return (default: 20) |

---

## search-issues

Search issues by text query (title contains, case insensitive)

```bash
linear-cc search-issues [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--query <text>` | Yes | Search text (matches title) |
| `--limit <n>` | No | Max results (default: 5) |
| `--status <status>` | Yes | Optional filter by state |

---

## list-projects

List available Linear projects from cache

```bash
linear-cc list-projects [options]
```

---

## list-comments

List comments on a Linear issue

```bash
linear-cc list-comments [options] <id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `id` | Yes | Issue identifier (PRO-426) or UUID |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--limit <number>` | No | Maximum number of comments to return (default: 50) |

---

## list-documents

List documents attached to a Linear issue

```bash
linear-cc list-documents [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--issue <id>` | Yes | Issue identifier (PRO-123) or UUID |
| `--title <pattern>` | Yes | Filter by title pattern (supports wildcards like |

---

## get-document

Get a document by ID or by searching issue documents by title pattern

```bash
linear-cc get-document [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--id <documentId>` | Yes | Document UUID |
| `--issue <id>` | Yes | Issue identifier (PRO-123) to search in |
| `--title <pattern>` | Yes | Title pattern to match (e.g., "[CONTEXT]*") |

---

## update-document

Update an existing Linear document

```bash
linear-cc update-document [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--id <documentId>` | Yes | Document UUID to update |
| `--issue <id>` | Yes | Issue identifier (PRO-123) to find document in |
| `--title-pattern <pattern>` | Yes | Title pattern to find document (e.g., |
| `--title <newTitle>` | Yes | New title for the document |
| `--content <content>` | Yes | New content for the document (markdown) |
| `--file <path>` | Yes | Read new content from file |

---

## upload-attachment

Upload a file attachment to a Linear issue (stub - upload not yet implemented)

```bash
linear-cc upload-attachment [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--issue <id>` | Yes | Issue identifier (PRO-123) |
| `--file <path>` | Yes | Path to file to upload |
| `--title <title>` | Yes | Title for the attachment |

---

## log-experiment

Log an experiment result to Linear with sub-issue and document update

```bash
linear-cc log-experiment [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--issue <id>` | Yes | Parent issue identifier (PRO-123) |
| `--name <name>` | Yes | Experiment name |
| `--hypothesis <hypothesis>` | Yes | What you are testing |
| `--results <results>` | Yes | Key metrics/results summary |
| `--finding <finding>` | Yes | Main takeaway |
| `--status <status>` | Yes | Status: complete, in-progress, or failed |
| `--json <path>` | Yes | Path to JSON results file |
| `--pdf <path>` | Yes | Path to PDF report file |

---
