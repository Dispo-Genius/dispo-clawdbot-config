# Create Issue Workflow

Create Linear issues with proper formatting, labels, and auto-branch creation.

**Policy:** ALL issue types require spec questioning process. No quick creation.

---

## Quick Reference: Good Issue Checklist

Before creating any issue, ensure it meets these criteria:

```
✅ Title starts with action verb (Fix, Add, Update, Remove, Refactor, Implement)
✅ Title is specific and scannable (4+ words, not "Auth bug" but "Fix login redirect on Safari")
✅ Assigned to a project (REQUIRED - will prompt if missing)
✅ Has appropriate label (bug, feature, improvement, refactor)
✅ Description uses template structure (see templates/ folder)
```

**Bad Examples:**
- ❌ "Bug" - too vague
- ❌ "Fix auth" - no context
- ❌ "Dark mode" - not actionable
- ❌ No project - free-floating

**Good Examples:**
- ✅ "Fix login redirect loop on mobile Safari"
- ✅ "Add dark mode toggle to settings page"
- ✅ "Remove deprecated analytics events from tracking"
- ✅ "Refactor auth middleware for better error handling"

---

## Step 1: Determine Type

**If type provided** (e.g., `/manage-linear create bug`):
- Use specified type

**Otherwise ask:**
```
What type of issue?
```
Options:
1. Bug - Something is broken
2. Feature - New functionality
3. Improvement - Enhance existing feature
4. Refactor - Code cleanup, no behavior change
5. Project - Create Linear project

**Note:** "Spec" is no longer a separate type. All types go through spec process.

---

## Step 2: Check for Conflicts & Duplicates (REQUIRED)

Before starting spec process, check Linear for potential conflicts:

### 2a. Search for Similar Issues

```bash
# Search for similar issues in last 60 days
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d '{"query": "query { issues(filter: { team: { id: { eq: \"05e533b4-661d-43df-84af-bec6f6c38f65\" } }, createdAt: { gte: \"DATE_60_DAYS_AGO\" } }, first: 50) { nodes { identifier title state { name } assignee { name } url } } }"}' https://api.linear.app/graphql
```

Search for issues matching:
- Similar keywords in title
- Same affected files/areas
- Related functionality

### 2b. Check In-Progress Work

Identify issues that might conflict:

| State | Risk | Action |
|-------|------|--------|
| In Progress | High | Alert user, may need coordination |
| In Review | Medium | Check if PR affects same files |
| Todo | Low | Note for awareness |
| Done (last 14 days) | Low | Check if already solved |

### 2c. Report Findings

If potential conflicts found:
```
POTENTIAL CONFLICTS DETECTED

In Progress:
- DIS-XX: [Title] (assigned to Name) - touches same area

Similar Issues:
- DIS-YY: [Title] (Done) - may already solve this

Continue with new issue creation?
```

**AskUserQuestion Options:**
- **Continue** - Proceed with spec process (no conflict)
- **Coordinate** - Contact assignee first before proceeding
- **Cancel** - Don't create, work on existing issue instead

---

## Step 3: Run Spec Process (REQUIRED)

**All issue types must go through the spec questioning process.**

For Bug, Feature, Improvement, or Refactor:
1. Store selected type (used for title prefix and labels)
2. Follow [create-spec.md](create-spec.md) workflow
3. Spec process will auto-detect complexity:
   - **Quick Spec** (15-20 questions): ≤3 files affected
   - **Full Spec** (25-40 questions): >3 files or new components
4. User can override complexity level if needed

The spec workflow handles:
- Rounds of questions to eliminate ambiguity
- Context gathering and codebase exploration
- Creating issue directly in Linear
- Branch creation

### Project (exception)
Projects don't require spec process:
1. Name
2. Summary (255 chars max)
3. Description (markdown)
4. Target date (optional)

---

## Step 4: Resolve Team

1. Parse CLAUDE.md for `use team: {NAME}` (case-insensitive)
2. If found: Look up team ID from [api-config.md](../references/api-config.md)
3. If not found: Ask user via AskUserQuestion

```
Which Linear team should this issue be created in?
```

**Note:** This step is handled within create-spec.md workflow.

---

## Step 5: Select Project (REQUIRED)

Every issue must be associated with a Linear project. This step runs after team resolution.

### 5a. List Available Projects

Run the list-projects command:
```bash
cd .claude/tools/linear-cc && npx ts-node src/index.ts list-projects
```

### 5b. Ask User to Select Project

Use AskUserQuestion with:
- All available projects from the list
- "Create new project" option at the end

```
Which project should this issue belong to?
```

### 5c. Handle Project Selection

**If existing project selected:**
- Store project name and ID in session state
- Continue to spec process

**If "Create new project" selected:**
1. Ask for project name
2. Run: `cd .claude/tools/linear-cc && npx ts-node src/index.ts create-project "<name>"`
3. Store new project name and ID in session state

### 5d. Store Session State

```
LINEAR_PROJECT_ID = {project.id}
LINEAR_PROJECT_NAME = {project.name}
```

This project will be used when creating the issue in the spec workflow.

---

## Step 6: Create Linear Issue (via spec workflow)

**Note:** Issue creation is handled by [create-spec.md](create-spec.md) at the end of the spec process.

The spec workflow will:
1. Use the issue type from Step 1 for title prefix: `[BUG]`, `[FEATURE]`, `[IMPROVEMENT]`, `[REFACTOR]`
2. Apply appropriate labels based on type and hasUI/hasUX flags
3. Create issue via Linear API
4. Create and checkout branch

**Labels Logic:**
```
labels = [type]  // Bug, Feature, Improvement label
if (hasUI) labels.push("ui")
if (hasUX) labels.push("ux")
```

---

## Step 7: Create Branch (via spec workflow)

**Note:** Branch creation is handled by [create-spec.md](create-spec.md).

Branch naming convention:
```
{prefix}/{issue-id}-{slug}
```

| Type | Prefix |
|------|--------|
| Bug | `fix/` |
| Feature | `feature/` |
| Improvement | `improve/` |
| Refactor | `refactor/` |

---

## Step 8: Set Session State

**Note:** Handled by [create-spec.md](create-spec.md).

Stores for use by other skills:
```
LINEAR_ISSUE_ID = {issue.id}                    # UUID
LINEAR_ISSUE_IDENTIFIER = {issue.identifier}    # e.g., "DIS-47"
```

---

## Step 9: Report

**Note:** Handled by [create-spec.md](create-spec.md).

Final report format:
```
ISSUE CREATED

{IDENTIFIER}: [{TYPE}] {title}
Branch: {branch_name}
Labels: {labels}
URL: {issue_url}

Ready to implement. Use /commit when done.
```

---

## Edge Cases

### Already on Feature Branch

If already on a non-main branch:
- Ask: "Create issue for current branch, or start new work?"
- Options: Link to current | Create new branch

### Linear CLI Not Available

See [shared error handling](../../_shared/linear-integration/error-handling.md).

If CLI fails:
- Warn: "Linear CLI not available. Issue will be created locally only."
- Create branch with generated ID: `{prefix}/local-{timestamp}-{slug}`
- Skip Linear creation

### Duplicate Issue Detection

Before creating:
- Search Linear for similar titles in last 30 days
- If potential duplicate found, ask user to confirm
