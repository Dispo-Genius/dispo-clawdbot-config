---
name: manage-linear
description: Linear integration via CLI. Triggers on "create issue", "new ticket", "create a ticket", "linear issue", "update status", "post comment".
metadata: {"clawdbot":{"emoji":"📋"}}
---

# Linear Integration

Use the `linear` service via gateway-cc for all Linear operations. All commands return JSON.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear <command> [options]
```

## Commands

### Create Issue
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear create-issue "Issue title" \
  --label feature \
  --project "Project Name" \
  --description "Description text"
```
**Required:** title, `--project` (enforced by workflow)
**Optional:** `--label`, `--assignee`, `--unassigned`, `--description`, `--priority` (1-4)

**Auto-assignment:** Issues are automatically assigned to the current user unless:
- `--assignee "Name"` → assigns to specified person
- `--unassigned` → leaves issue unassigned

### Get Issue
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear get-issue DIS-47
```

### Update Status
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear update-status DIS-47 in-progress
```
**Valid statuses:** backlog, todo, in-progress, in-review, done, canceled

### Update Issue
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear update-issue DIS-47 \
  --description "Updated description text" \
  --project "Project Name" \
  --assignee "Jane Smith" \
  --priority 2
```
**Optional:** `--description`, `--project`, `--assignee`, `--priority` (1-4), `--due` (YYYY-MM-DD)

### Create Comment
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear create-comment DIS-47 "Comment body"
```

### Create Document
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear create-document "Document Title" "Content here" \
  --issue PRO-123
```
**Required:** title
**Optional:** content, `--file <path>`, `--issue <id>`, `--project <uuid>`

Creates a document attached to an issue or project. Preferred over comments for:
- Checkpoint handoffs (editable, searchable)
- Long-form context that may need updates
- Documentation that should be visible under Resources tab

### List Issues
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear list-issues --status in-progress --label feature
```
**Optional:** `--status`, `--label`, `--project`, `--assignee`, `--limit`

### List Projects
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear list-projects
```
Lists all available projects from cache. Used during issue creation to prompt for project selection.

### Create Project
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear create-project "Project Name" \
  --description "Project description"
```
**Required:** name
**Optional:** `--description`

### Sync (Setup)
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear sync
```
Run this once to cache team IDs. Required before other commands.

### Search Issues
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear search-issues --query "text" --limit 5 --status in-progress
```
Searches issue titles (case-insensitive).
**Optional:** `--limit` (default 5), `--status`

### List Comments
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear list-comments DIS-47
```

### Get Document
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear get-document <document-id>
```

### List Documents
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear list-documents --issue DIS-47 --title "pattern*"
```
Supports wildcard patterns in `--title`.

### Update Document
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear update-document <document-id> --title "New Title" --content "New content"
```

### Upload Attachment (Not Yet Implemented)
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear upload-attachment --issue DIS-47 --file /path/to/file
```

**Status:** Stub only - Linear GraphQL API doesn't support direct file upload.

**Workarounds for screenshots/files:**
1. Upload via Linear UI directly
2. Host externally (Imgur, S3) and include link in comment
3. Use `agent-browser screenshot` to capture, then reference the local path

---

## Spec Writing Workflow

**REQUIRED:** Before creating any issue, write a proper spec.

### Quick Issues (skip spec)

Skip the full spec process if ALL are true:
- Single file change
- < 20 lines of code
- No UI/UX decisions
- No architectural decisions

### Standard Issues (full spec required)

For features, improvements, or UI work:

1. **Gather requirements** using [question-bank.md](references/question-bank.md)
2. **Write spec** following [spec-template.md](references/spec-template.md)
3. **Create issue** with spec as description

### Spec Checklist

Verify before creating issue:
- [ ] Problem statement explains WHY
- [ ] User story identifies WHO and WHAT
- [ ] Acceptance criteria are testable
- [ ] Edge cases covered (if applicable)

### Executing Specs

When starting work on a spec:
1. Convert acceptance criteria to tasks via TaskCreate
2. Mark todos as in_progress/completed as you work
3. Post progress updates to Linear via `create-comment`

---

## Response Format

**Success:**
```json
{"success": true, "identifier": "DIS-47", "url": "https://linear.app/..."}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```

---

## Available Options

### Labels
bug, feature, improvement, spec, ui, ux, refactor, tests, documentation, ci/cd, bug-fix, ui/ux

### Projects
Nebula, DX Improvements, Code Quality Agents, Claude Code Skills, Global Features, Design Studio, Settings, Website and Marketing, Home Dashboard, Deals Board, Investors Tab, Property Data Aggregation - Phase 1, Prototype Enhancements, v2 Dispo Genius, Project Blue

### Members
See `.claude/team.yaml` for current team members.

### Statuses
backlog, todo, in-progress, in-review, done, canceled, duplicate

---

## Templates

Issue and comment templates in `templates/` folder:

| Template | Use For |
|----------|---------|
| `bug.md` | Bug reports with repro steps |
| `feature.md` | New functionality with acceptance criteria |
| `improvement.md` | Enhancements to existing features |
| `refactor.md` | Code cleanup, no behavior change |
| `spec.md` | Full specifications (simple + complex) |
| `project.md` | Linear projects |
| `progress-comment.md` | Structured comments: `[PROGRESS]`, `[DECISION]`, `[BLOCKED]` |

---

## References

- `references/api-config.md` - Team IDs, state IDs, GraphQL patterns
- `references/github-integration.md` - Auto-status setup with GitHub
- `references/question-bank.md` - Questions for spec gathering
- `references/error-handling.md` - Error recovery patterns

---

## Usage Pattern

1. User asks to create/manage Linear issues
2. Run the appropriate CLI command
3. Parse JSON response
4. Report result to user

**Example:**
User: "Create a test issue in Prototype Enhancements"
→ Run: `npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear create-issue "Test issue" --project "Prototype Enhancements"`
→ Response: `{"success": true, "identifier": "DIS-150", "url": "..."}`
→ Report: "Created DIS-150: https://linear.app/..."
