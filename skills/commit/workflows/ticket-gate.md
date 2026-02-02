# Step 2: Ticket Gate

ALL commits require a Linear ticket. This step ensures one exists before proceeding.

**Shared reference:** See [ticket-detection.md](../../_shared/linear-integration/ticket-detection.md) for the canonical detection pipeline.

## Detection Priority

### 1. Session State (Instant)

```
IF LINEAR_ISSUE_ID exists in session:
  OUTPUT: "Using ticket {LINEAR_ISSUE_IDENTIFIER}"
  RETURN (already linked)
```

### 2. Branch Name Pattern (Instant)

```bash
BRANCH=$(git branch --show-current)
```

Match pattern: `.*/dis-(\d+)-.*` (case insensitive)

Examples:
- `improve/dis-124-design-studio-migration` → DIS-124
- `fix/dis-47-badge-positioning` → DIS-47
- `feature/dis-200-new-investor-flow` → DIS-200

```
IF MATCH:
  ISSUE_ID = "DIS-{N}"
  TRY:
    issue = get_issue(ISSUE_ID)  # Linear API
    IF valid:
      Set LINEAR_ISSUE_ID = issue.id (UUID)
      Set LINEAR_ISSUE_IDENTIFIER = issue.identifier
      OUTPUT: "Linked to {ISSUE_ID}: {issue.title}"
      RETURN
  CATCH:
    # Degraded mode - use ID without validation
    WARN: "Could not validate {ISSUE_ID} (API unavailable)"
    Set LINEAR_ISSUE_IDENTIFIER = ISSUE_ID
    RETURN
```

### 3. Search Linear (API Call)

```bash
CHANGED_FILES=$(git diff --name-only HEAD)
```

```
TRY:
  # Query active tickets for team
  issues = list_issues(filter: {
    team: PROTOTYPE,
    state: { nin: ["Done", "Canceled"] }
  })

  # Score each by file overlap
  candidates = []
  FOR each issue:
    linkedFiles = parse(issue.description, "## Files" or "## Linked Files")
    IF linkedFiles.length > 0:
      overlap = intersection(linkedFiles, CHANGED_FILES)
      score = overlap.length / linkedFiles.length
      IF score > 0.5:
        candidates.push({issue, score})

  # Decision based on matches
  IF candidates.length == 1 AND candidates[0].score > 0.8:
    # High confidence - auto-link
    OUTPUT: "Auto-linked to {issue.identifier}: {issue.title}"
    Set LINEAR_ISSUE_ID, LINEAR_ISSUE_IDENTIFIER
    RETURN

  IF candidates.length >= 1:
    # Multiple matches - ask user
    ASK via AskUserQuestion:
      header: "Select ticket"
      question: "Which ticket are you implementing?"
      options:
        - "{DIS-XX}: {title} ({score}% match)" for each candidate
        - "Create new ticket"

    IF user selects existing:
      Set LINEAR_ISSUE_ID, LINEAR_ISSUE_IDENTIFIER
      RETURN
    IF user selects "Create new":
      GOTO Step 4

  # No matches found
  GOTO Step 4

CATCH (API unavailable):
  WARN: "Linear search unavailable"
  GOTO Step 4
```

### 4. Auto-Create Ticket

Infer type from context:

```
type = inferType(CHANGED_FILES, BRANCH)

Rules:
- Branch starts with "fix/" OR commit message contains "fix" → bug
- New files in components/, app/, pages/ → feature
- Default → improve
```

Invoke manage-linear create:

```
/manage-linear create {type}

The skill will:
1. Ask for title (required)
2. Generate description from context
3. Create issue in Linear
4. Create new branch with pattern: {prefix}/dis-{N}-{slug}
5. Set LINEAR_ISSUE_ID and LINEAR_ISSUE_IDENTIFIER

RETURN with ticket set
```

### 5. Escape Hatch (All Detection/Creation Failed)

If we reach here without a ticket:

```
ASK via AskUserQuestion:
  header: "No ticket"
  question: "Could not detect or create a Linear ticket. Proceed anyway?"
  options:
    - "Proceed without ticket (not recommended)"
    - "Abort commit"

IF "Proceed":
  WARN: "Committing without Linear ticket - work will not be tracked"
  RETURN (with no ticket)

IF "Abort":
  OUTPUT: "Commit aborted. Create a ticket first: /manage-linear create"
  ABORT
```

---

## Spec Validation

When linked ticket has the `spec` label, validate it follows the writing-specs template.

**Required markers** (at end of description):
- `hasUI: {true|false}`
- `hasUX: {true|false}`

```
IF issue has "spec" label:
  hasUI = parse(description, "hasUI:\s*(true|false)")
  hasUX = parse(description, "hasUX:\s*(true|false)")

  IF hasUI is null OR hasUX is null:
    WARN: "Spec is missing hasUI/hasUX markers"
    ASK via AskUserQuestion:
      header: "Spec markers"
      question: "Add missing markers now?"
      options:
        - "Yes, I'll answer 2 questions"
        - "No, use defaults (hasUI=true, hasUX=false)"

    IF "Yes":
      ASK: "Does this spec involve UI changes?" → hasUI
      ASK: "Does this spec involve new user flows?" → hasUX
      UPDATE issue description with markers
    ELSE:
      hasUI = true
      hasUX = false
      WARN: "Using default markers - review gates may not be accurate"
```

---

## Failure Handling

See [shared error handling](../../_shared/linear-integration/error-handling.md) for standard patterns.

| Failure | Response |
|---------|----------|
| Linear CLI down | WARN + use branch-derived ID if available |
| Session state lost | Recover from branch name pattern |
| No matches found | Trigger create flow |
| User cancels create | Offer escape hatch or abort |
| All detection fails | Ask user: proceed or abort |

---

## Output

After this step completes:

| Variable | Value |
|----------|-------|
| `LINEAR_ISSUE_ID` | UUID (for API calls) or null if escaped |
| `LINEAR_ISSUE_IDENTIFIER` | e.g., "DIS-124" (for display) or null |
| `hasUI` | boolean (for review gates) |
| `hasUX` | boolean (for review gates) |

---

## Integration

This step runs AFTER Step 1 (Check Branch) and BEFORE Step 3 (Spec Metadata).

Next step (Step 3) will:
- Extract additional metadata from the linked ticket
- Determine which review gates to run based on hasUI/hasUX
