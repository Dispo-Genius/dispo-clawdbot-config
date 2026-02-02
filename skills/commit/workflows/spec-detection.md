# Spec Metadata & Linear Integration

This workflow handles spec metadata extraction and Linear status updates.

**Note:** Ticket detection has moved to [ticket-gate.md](ticket-gate.md) (Step 2).

---

## Step 3: Spec Metadata Extraction

**Goal:** Extract hasUI/hasUX flags from the linked ticket to determine review gates.

**Precondition:** Step 2 has already set `LINEAR_ISSUE_ID` and `LINEAR_ISSUE_IDENTIFIER`.

### If LINEAR_ISSUE_ID is set:

1. **Fetch issue from Linear:**
   ```bash
   curl -s -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: $LINEAR_API_KEY" \
     -d '{"query": "query Issue($id: String!) { issue(id: $id) { id identifier title description labels { nodes { name } } } }", "variables": {"id": "{LINEAR_ISSUE_ID}"}}' \
     https://api.linear.app/graphql
   ```

2. **Extract metadata from description:**
   ```
   hasUI = parse(description, "hasUI:\s*(true|false)") ?? true
   hasUX = parse(description, "hasUX:\s*(true|false)") ?? false
   ```

3. **Check if spec:**
   ```
   isSpec = labels.includes("spec")
   ```

### If LINEAR_ISSUE_ID is NOT set (degraded mode):

- Use defaults: `hasUI = true`, `hasUX = false`
- Log: "No ticket linked, using default review gates"

### Output

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `hasUI` | boolean | true | Triggers UI review gate |
| `hasUX` | boolean | false | Triggers UX audit gate |
| `isSpec` | boolean | false | Indicates formal spec |

---

## Work Started (after Step 3, if LINEAR_ISSUE_ID)

**Goal:** Update Linear issue status when implementation begins.

**Skip if:** No LINEAR_ISSUE_ID or `--spec` flag provided (already in progress).

### Actions

1. Update issue status to "In Progress":
   ```bash
   # State ID: b4f02fc8-e392-4a23-9fb4-e0b349c06762
   ```

2. Post progress update:
   ```
   /manage-linear update work-started
   ```

3. Output: "Started work on {LINEAR_ISSUE_IDENTIFIER}"

---

## PR Created Notification (Step 11)

**Trigger:** After PR is created in Step 11 (Push & PR).

**Skip if:** No LINEAR_ISSUE_ID.

### Actions

1. Invoke: `/manage-linear update pr-created`

2. Context passed:
   - `prNumber` - PR number
   - `prUrl` - Full PR URL
   - `branchName` - Current branch
   - `summary` - Why section from PR body
   - `vercelPreviewUrl` - If PREVIEW_LINKS exist

---

## Work Completed (after merge)

**Trigger:** After PR is merged to main.

**Skip if:** No LINEAR_ISSUE_ID or PR not merged.

### Actions

1. Update issue status to "Done":
   ```bash
   # State ID: bba01b99-400e-4fa8-aa16-fff9e37c10d5
   ```

2. Invoke: `/manage-linear update work-completed`

3. Report: "Completed {LINEAR_ISSUE_IDENTIFIER} - PR merged"

---

## Error Handling

| Error | Response |
|-------|----------|
| API unavailable | Use defaults, log warning |
| Issue not found | Use defaults, log warning |
| Parse failure | Use defaults (hasUI=true, hasUX=false) |

**Principle:** Linear failures never block git workflow.
