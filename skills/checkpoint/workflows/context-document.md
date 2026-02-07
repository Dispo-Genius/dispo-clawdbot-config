# Context Document Workflow

> **DEPRECATED:** This workflow is no longer used. Context is now stored in spec files (`.claude/specs/{slug}.md`) with a Session Log section. See `/spec` skill for the spec format.
>
> **Why deprecated:** Spec files are local, faster to access, and co-located with the task definition. Linear stays lean with just brief checkpoint comments.

---

*Historical documentation kept below for reference.*

---

How to maintain a living context document per ticket instead of creating new documents on each checkpoint.

---

## Concept: Living Document Model

Instead of creating a NEW document per checkpoint (which dilutes context), maintain ONE "Context Document" per ticket that gets UPDATED.

```
1 ticket = 1 Context Document "[CONTEXT] {ticket-id}"
├── Decisions (append-only, never removed)
├── Current Session (replaced each checkpoint)
└── Session History (compressed archives)
```

---

## Document Structure

```markdown
# [CONTEXT] {TICKET-ID}

## Decisions
> Key decisions with rationale. Append new, preserve existing.

- [YYYY-MM-DD] {Decision} because {rationale}
- [YYYY-MM-DD] {Decision} because {rationale}

## Current Session
**Last Updated:** YYYY-MM-DD
**Status:** {In Progress | Blocked | Near Complete}

### Summary
{current work description}

### Files Touched
- `{path}` - {what changed}
- `{path}` - {what changed}

### Next Steps
1. {First priority}
2. {Second priority}

## Session History
> Compressed summaries of previous sessions.

### Session {N} (YYYY-MM-DD)
- {Key accomplishment}
- {Key accomplishment}
```

---

## Workflow: Check for Existing Document

Before creating a new document, check if one exists:

```bash
# Step 1: List documents on the issue
npx tsx .claude/tools/linear-cc/src/index.ts list-documents \
  --issue {TICKET} \
  --title "[CONTEXT]*"
```

**If document exists:**
1. Fetch its content with `get-document`
2. Parse existing sections
3. Merge new content (see merging rules below)
4. Update with `update-document`

**If no document:**
1. Create new document with full structure
2. Use `create-document` command

---

## Workflow: Fetch and Parse Existing Document

```bash
# Get existing context document
npx tsx .claude/tools/linear-cc/src/index.ts get-document \
  --issue {TICKET} \
  --title "[CONTEXT]*"
```

Parse response JSON to get `content` field, then split into sections:
- `## Decisions` - preserve completely, append new
- `## Current Session` - will be replaced
- `## Session History` - archive previous "Current Session" here

---

## Merging Rules

### Decisions
- **NEVER DELETE** existing decisions
- Only ADD new decisions with inline rationale
- Format: `- [YYYY-MM-DD] {Decision} because {rationale}`

### Current Session
- **REPLACE** entirely with new session content
- Old "Current Session" gets compressed to "Session History"

### Session History
- **APPEND** compressed summary of previous "Current Session"
- Increment session number
- Keep summaries brief (3-5 bullet points max)

---

## Workflow: Update Document

```bash
# Write merged content to temp file
cat << 'EOF' > /tmp/context-update.md
{merged_content}
EOF

# Update the document
npx tsx .claude/tools/linear-cc/src/index.ts update-document \
  --issue {TICKET} \
  --title-pattern "[CONTEXT]*" \
  --file /tmp/context-update.md
```

---

## Full Checkpoint Flow with Living Document

```
1. Detect ticket (existing workflow)
2. Check for [CONTEXT] document:
   - EXISTS: Fetch, parse, prepare merge
   - NOT EXISTS: Prepare new document structure
3. Gather session context (existing workflow)
4. Add new decisions to "## Decisions" (append, never delete)
5. Archive previous "Current Session" to "Session History"
6. Write new "Current Session"
7. Update document (or create if new)
8. Post brief comment for timeline visibility
9. Generate handoff prompt
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Document fetch fails | Warn, create new document |
| Document update fails | Warn, fall back to creating new document |
| Parse fails (malformed) | Warn, preserve raw content, add new sections at end |
| API timeout | Retry once, then warn and continue |

---

## Benefits Over Old Approach

| Old (New Doc Each Time) | New (Living Document) |
|------------------------|----------------------|
| Context diluted across many docs | Single source of truth |
| Hard to find old decisions | Decisions always at top |
| No session history | Compressed session archive |
| Lost context on ticket switch | Document persists with ticket |
