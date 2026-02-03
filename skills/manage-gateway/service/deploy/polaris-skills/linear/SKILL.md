---
name: linear
description: Linear project management. Create issues, update status, add comments. Triggers on "create issue", "new ticket", "linear issue", "update status", "post comment", "list issues".
metadata: {"clawdbot":{"emoji":"📋","requires":{"env":["LINEAR_API_KEY"]}}}
---

# Linear Integration

Use the `linear` service via gateway-cc for all Linear operations.

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear <command> [options]
```

## Commands

### sync
Fetch teams and projects, cache locally. **Run once before other commands.**
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear sync
```

### create-issue
Create a new issue.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear create-issue "Issue title" \
  --label feature \
  --project "Project Name" \
  --description "Description text"

# Required: title, --project
# Optional: --label, --assignee, --unassigned, --description, --priority (1-4)
```

### get-issue
Get issue details.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear get-issue PRO-123
```

### update-status
Update issue status.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear update-status PRO-123 in-progress

# Valid statuses: backlog, todo, in-progress, in-review, done, canceled
```

### update-issue
Update issue fields.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear update-issue PRO-123 \
  --description "Updated description" \
  --project "Project Name" \
  --assignee "Jane Smith" \
  --priority 2

# Optional: --description, --project, --assignee, --priority (1-4), --due (YYYY-MM-DD)
```

### create-comment
Add a comment to an issue.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear create-comment PRO-123 "Comment body"
```

### list-comments
List comments on an issue.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear list-comments PRO-123
```

### list-issues
List issues with filters.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear list-issues --status in-progress --label feature

# Optional: --status, --label, --project, --assignee, --limit
```

### search-issues
Search issues by text.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear search-issues --query "text" --limit 5 --status in-progress
```

### list-projects
List all projects.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear list-projects
```

### create-project
Create a new project.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear create-project "Project Name" --description "Description"
```

### create-document
Create a document attached to an issue or project.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear create-document "Title" "Content" --issue PRO-123
```

### get-document
Get document content.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear get-document <document-id>
```

### list-documents
List documents.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear list-documents --issue PRO-123 --title "pattern*"
```

### update-document
Update a document.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec linear update-document <document-id> --title "New Title" --content "New content"
```

## Response Format

**Success:**
```json
{"success": true, "identifier": "PRO-123", "url": "https://linear.app/..."}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```

## Labels
bug, feature, improvement, spec, ui, ux, refactor, tests, documentation

## Statuses
backlog, todo, in-progress, in-review, done, canceled, duplicate
