# Update Progress Workflow

Post structured progress comments to Linear issues.

---

## Prerequisites

1. **Linear CLI available** - See [shared CLI reference](../../_shared/linear-integration/cli-reference.md)

2. **LINEAR_ISSUE_ID detected** - From:
   - Session state (set by create-issue)
   - Branch name pattern: `*/dis-{N}-*` → DIS-{N}
   - Explicit `--issue={id}` parameter

**If no LINEAR_ISSUE_ID:**
- Skip silently (no error)
- Log: "No Linear issue detected, skipping update"

---

## Step 1: Detect Linear Issue

1. Check session state for `LINEAR_ISSUE_ID`
2. If not found, parse branch name:
   ```
   feature/dis-47-*  →  DIS-47
   fix/dis-47-*      →  DIS-47
   ```
3. If found, fetch issue UUID via API (identifiers need conversion)
4. If not found, skip silently

---

## Step 2: Generate Comment (Haiku Subagent)

Spawn haiku subagent to write the comment:

```
Write a Linear issue comment for event: {event-type}

Context:
- Issue: {LINEAR_ISSUE_ID}
- Recent work: {summary of recent actions}
- Todo list: {current todo state}
- Event details: {event-specific info}

Use this template:
{template for event type}

Keep it concise. Focus on actionable information.
Return ONLY the markdown comment text.
```

**Why subagent?**
- Keeps main context window clean
- Haiku is fast and cheap
- Summarization is its strength

---

## Step 3: Post to Linear

**Primary:** Linear API via curl

**API key must be set in environment** (see [api-config.md](../references/api-config.md#authentication)):
```bash
# LINEAR_API_KEY must be set in shell environment
# Add to ~/.zshrc: export LINEAR_API_KEY="lin_api_XXXXX"
```

```bash
ISSUE_UUID="{issue-uuid}"  # Must be UUID, not identifier

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{
    "query": "mutation CommentCreate($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id } } }",
    "variables": {
      "input": {
        "issueId": "'"$ISSUE_UUID"'",
        "body": "Comment body in markdown"
      }
    }
  }' \
  https://api.linear.app/graphql
```

**Error handling:** See [shared error handling](../../_shared/linear-integration/error-handling.md) - warn and continue.

---

## Step 4: Confirm

Log (don't clutter output):
```
Posted update to {LINEAR_ISSUE_IDENTIFIER}: {event-type}
```

---

## Comment Templates

### work-started

```markdown
## Implementation Started

Working on this issue. Will post updates as progress is made.

**Approach:**
{1-2 sentence summary of planned approach}

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### todo-completed

```markdown
## Progress Update

**Completed:**
- {Completed task description}

**Next:**
- {Next task from todo list, or "Continuing implementation"}

**Blockers:** None

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### blocker-hit

```markdown
## Blocker Encountered

**Issue:**
{Description of the error/blocker}

**Attempted:**
- {What was tried}
- {What was tried}

**Investigating:** {Current approach to resolve}

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### blocker-resolved

```markdown
## Blocker Resolved

**Was:** {Brief description of blocker}

**Fix:** {How it was resolved}

**Continuing with:** {Next task}

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### reviews-passed

```markdown
## Reviews Passed

| Review | Result |
|--------|--------|
| Code | {A/B/C} |
| UI | {PASS/N/A} |
| UX | {PASS/N/A} |

Ready for merge.

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### work-completed

**CRITICAL:** Validation MUST pass before posting this.

```markdown
## Implementation Complete

**PR:** [#{prNumber}]({prUrl})
**Commit:** `{commitHash}`

**Summary:**
{1-2 sentence summary of what was implemented}

**Files changed:** {count}

**Validation:**
{Results from testing steps}

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### work-paused (explicit invocation only)

```markdown
## Work Paused

**Completed so far:**
{List of completed items}

**Remaining:**
{List of pending items}

**Notes:**
{Any context for next session}

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### pr-created

```markdown
## PR Created

**PR:** [#{prNumber}]({prUrl})
**Branch:** `{branchName}`

**Summary:**
{1-2 sentence summary from commit message}

**Preview:** [Vercel Preview]({vercelPreviewUrl})

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

### release-included

```markdown
## Included in Release

**Version:** [{vX.Y.Z}]({githubReleaseUrl})
**Deployed:** {YYYY-MM-DD}
**Environment:** Production

This issue has shipped to production.

---
*Auto-update by Claude | {LINEAR_ISSUE_IDENTIFIER}*
```

---

## Validation Before Done

**CRITICAL:** Never mark an issue Done without validation.

### When Required
- `work-completed` event (always)
- User says "mark done"
- PR merged to main

### Process

1. Fetch issue description from Linear
2. Parse "Testing" section
3. Execute each validation step:
   - UI checks: screenshot and verify
   - Routes: navigate and confirm
   - Functionality: test behavior
4. Record results
5. Only proceed if ALL pass

### If Validation Fails

1. DO NOT mark Done
2. Post validation failure comment
3. Fix the issue
4. Re-run validation
5. Only then mark Done

---

## Error Handling

See [shared error handling](../../_shared/linear-integration/error-handling.md).

| Error | Action |
|-------|--------|
| API key missing | Skip, log: "Linear API key not configured" |
| CLI fails | Skip, log warning |
| Issue not found | Skip, log warning |
| Comment fails | Log error, continue workflow |
| Subagent timeout | Use fallback simple template |

**Critical:** Never block the main workflow due to Linear update failures.
