# Create Spec Workflow

Create comprehensive specifications through exhaustive questioning, then store directly in Linear.

**Policy:** ALL issue types (bug, feature, improvement, refactor) must go through this spec process.

**Philosophy:**
- Ambiguity is the enemy - If two developers could interpret it differently, it's not specific enough
- Questions over assumptions - Ask 10 questions rather than assume 1 thing
- Concrete over abstract - "Blue button, 56px height" not "prominent CTA"
- Linear is single source of truth - No local spec files

---

## Issue Type Context

When invoked from [create-issue.md](create-issue.md), an issue type is passed:

| Type | Title Prefix | Label |
|------|--------------|-------|
| Bug | `[BUG]` | Bug |
| Feature | `[FEATURE]` | Feature |
| Improvement | `[IMPROVEMENT]` | Improvement |
| Refactor | `[REFACTOR]` | Refactor |

The spec process is the same for all types. Type only affects the title prefix and labels applied.

---

## Workflow State Management (REQUIRED)

**Use TaskCreate/TaskUpdate to track progress through spec creation.**

### Quick Spec (3 phases)

```
TaskCreate([
  {content: "Phase 1: Define (8-10 questions)", status: "in_progress", activeForm: "Defining scope"},
  {content: "Phase 2: Detail (8-10 questions)", status: "pending", activeForm: "Detailing behavior"},
  {content: "Phase 3: Generate & create in Linear", status: "pending", activeForm: "Creating in Linear"}
])
```

### Full Spec (6 phases)

```
TaskCreate([
  {content: "Phase 0: Context gathering", status: "in_progress", activeForm: "Gathering context"},
  {content: "Phase 1: Scope definition (4-5 questions)", status: "pending", activeForm: "Defining scope"},
  {content: "Phase 2: Behavior specification (4-5 questions)", status: "pending", activeForm: "Specifying behavior"},
  {content: "Phase 3: Edge cases and errors (4-5 questions)", status: "pending", activeForm: "Handling edge cases"},
  {content: "Phase 4: Integration and architecture (4-5 questions)", status: "pending", activeForm: "Planning architecture"},
  {content: "Phase 5: Acceptance criteria (3-4 questions)", status: "pending", activeForm: "Defining criteria"},
  {content: "Create in Linear", status: "pending", activeForm: "Creating in Linear"}
])
```

### At Each Phase Transition

1. Mark current phase as `completed`
2. Mark next phase as `in_progress`
3. Include summary: `[scope: deal card modal]`, `[hasUI: true]`

---

## Mode Selection

| Mode | When | Questions |
|------|------|-----------|
| **Quick Spec** | ≤3 files, no new components | 15-20 questions |
| **Full Spec** | Complex features, new UI | 25-40 questions |

---

## Auto-Complexity Detection (After Phase 0)

**When:** After Phase 0 context gathering completes.

**How:** Analyze exploration results to determine complexity:

### Detection Criteria

| Criteria | Quick Spec | Full Spec |
|----------|------------|-----------|
| Files affected | ≤3 files | >3 files |
| New components | No | Yes |
| New types/interfaces | Minor | Significant |
| Cross-cutting concerns | No | Yes (auth, routing, state) |
| User flow changes | None/minimal | New flows |

### Detection Logic

```
After Phase 0 exploration:

1. Count affected files from agent findings
2. Check if new components mentioned
3. Check for cross-cutting concerns

if (fileCount > 3 OR newComponents OR crossCutting):
    suggestedMode = "Full Spec"
else:
    suggestedMode = "Quick Spec"
```

### User Override

After detection, confirm with user:

```
COMPLEXITY DETECTED

Based on exploration:
- Files affected: {count}
- New components: {yes/no}
- Cross-cutting: {yes/no}

Suggested: {Quick Spec | Full Spec}

Proceed with suggested mode?
```

**AskUserQuestion Options:**
- **Yes, use {suggested}** (Recommended)
- **Use Quick Spec** - Force simpler process
- **Use Full Spec** - Force comprehensive process

---

## Quick Spec Flow (Simple Features)

### Phase 1: Define (8-10 questions)

Combines scope + success criteria:
- What's the problem? (1-2 sentences)
- Where does this live? (file path)
- What's the entry point?
- What's the primary action?
- What does success look like?
- What must NOT happen?

### Phase 2: Detail (8-10 questions)

Combines behavior + edge cases:
- What @ds components are used? (specify per field for forms)
- What are the states? (empty, loading, error)
- What validation is needed?
- What feedback does user receive?

### Phase 3: Generate & Create

Output spec and create in Linear (skip to [Create in Linear](#create-in-linear)).

---

## Full Spec Flow (Complex Features)

### Phase 0: Context Gathering

**Goal:** Understand what exists before asking questions.

**Actions:** Deploy 2-3 Explore agents in parallel:

| Agent | Focus | Search Patterns |
|-------|-------|-----------------|
| Agent 1 | Find similar features | `components/**/*.tsx`, related names |
| Agent 2 | Understand feature area | Directory structure, existing patterns |
| Agent 3 | Identify dependencies | `types.ts`, hooks, shared components |

**Output:** Context summary: "Found X related components, Y existing patterns."

---

### Phase 1: Scope Definition (4-5 questions)

**Goal:** Establish boundaries and core purpose.

**Questions:** See [question-bank.md](../references/question-bank.md#problem-space)

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What specific problem does this solve for the user? | Ensures real problem |
| 2 | What happens today without this? (current workaround) | Clarifies pain point |
| 3 | Where in the app does this problem occur? | Narrows scope |
| 4 | Who experiences this problem? (user role) | Right audience |
| 5 | Is there an existing partial solution? | Patterns to follow |

**Integration:** After scope questions, apply first-principles thinking:
- Is this requirement necessary?
- What can be deleted from scope?
- What's the simplest version that delivers value?

**Output:** Problem statement and scope boundaries

---

### Phase 2: Behavior Specification (4-5 questions)

**Goal:** Define exact behaviors with no ambiguity.

**Questions:** See [question-bank.md](../references/question-bank.md#solution-space)

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What is the single-sentence description? | Forces clarity |
| 2 | What is the entry point? (how user gets here) | Defines trigger |
| 3 | What is the exit point? (how user leaves) | Defines completion |
| 4 | What layout pattern? (modal, page, panel, inline) | Structure |
| 5 | What are the primary actions? (button labels) | Action hierarchy |

**Integration:** Invoke `/building-ui` to identify:
- Reusable components from design system
- Design tokens that apply
- UI patterns to follow

**For forms, explicitly list each field:**

| Form Field | Field Type | @ds Component |
|------------|------------|---------------|
| Name | text input | `TextInput` |
| Description | multi-line | `Textarea` |
| Amount | currency | `MoneyInput` |
| Category | dropdown | `SingleSelectDropdown` |

**Output:** Behaviors section with state table

---

### Phase 3: Edge Cases and Errors (4-5 questions)

**Goal:** Anticipate failure modes and edge cases.

**Questions:** See [question-bank.md](../references/question-bank.md#edge-cases)

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What if there's no data? (empty state) | Prevents blank screens |
| 2 | What if data is loading? | Prevents jarring transitions |
| 3 | What if an API call fails? | Graceful degradation |
| 4 | What if input is invalid? | Prevents bad data |
| 5 | What if user double-clicks? | Prevents duplicates |

**Standard categories to always check:**
1. Data states: Empty, loading, error, partial
2. Permission states: Unauthorized, read-only, admin-only
3. Input states: Invalid, too long, special chars, empty required
4. Timing states: Slow network, timeout, double-click, concurrent
5. Device states: Mobile viewport, touch vs mouse, zoom

**Integration:** Invoke `/building-ux` to assess:
- Step count in the flow
- Cognitive load
- Accessibility requirements

**Output:** Edge cases table with explicit handling

---

### Phase 4: Integration and Architecture (4-5 questions)

**Goal:** Define how this connects to the rest of the system.

**Questions:** See [question-bank.md](../references/question-bank.md#technical)

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | Where does this component live? (file path) | Defines location |
| 2 | What hooks or context does this need? | Dependencies |
| 3 | Does this need URL state? | Affects routing |
| 4 | Does this need persistent state? | Data layer |
| 5 | What TypeScript interfaces are needed? | Type-first dev |

**Output:** Architecture section with file paths, dependencies

---

### Phase 5: Acceptance Criteria (3-4 questions)

**Goal:** Define measurable success criteria.

**Questions:** See [question-bank.md](../references/question-bank.md#success-criteria)

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What does "done" look like? | Enables verification |
| 2 | How do we know it works? (test steps) | Test script |
| 3 | What should NOT happen? | Catches regressions |

**Each criterion must be:**
- **Observable:** Can be seen or measured
- **Specific:** No ambiguous terms
- **Testable:** A human can verify pass/fail

**Good examples:**
- "User can add a deal without leaving the board"
- "New deal appears in first column within 500ms"
- "Form shows inline error when address is empty"

**Bad examples:**
- "Works correctly" (what does "correctly" mean?)
- "Is fast" (how fast?)
- "Looks good" (according to whom?)

**Output:** Testable acceptance criteria list

---

## Question Strategy

### Batching Rules

- **Batch size:** 4-5 questions per round (cognitive load limit)
- **Order:** Problem → Solution → UI/UX → Technical → Edge Cases → Success
- **Adapt:** Skip irrelevant questions, go deeper where needed

### When to Stop

Stop when ALL are true:
- Every spec section can be written (no placeholders)
- No circular or contradictory answers
- User hasn't said "I don't know" to more than 2 key questions

### Handling "I Don't Know"

| Response | Action |
|----------|--------|
| To problem question | Flag as risk; document assumption |
| To UI question | Offer 2-3 concrete options |
| To edge case | Default to safest behavior |
| Multiple in a row | Pause; spec may not be ready |

### Red Flags

| User says... | Ask instead |
|--------------|-------------|
| "Make it user-friendly" | "What specifically makes it user-friendly?" |
| "Similar to X" | "Show me X? What aspects should match?" |
| "Handle edge cases" | "Which specific edge cases?" |
| "Good performance" | "What latency is acceptable?" |
| "Standard behavior" | "Standard according to which app?" |

---

## Screenshot/Mockup Analysis

When user provides screenshots or mockups, analyze each:

1. **What state is this?** (empty, loading, filled, error, success)
2. **What can user interact with?** (buttons, inputs, links)
3. **What is display-only?** (labels, icons, static text)
4. **What user action leads here?** (entry point)
5. **What user action exits?** (buttons, backdrop, ESC)

**Ask to confirm:** "In screenshot X, I see [element]. Is this interactive or display-only?"

**Common misinterpretations:**
- Boxes with numbers: INPUT fields or DISPLAY boxes?
- Buttons with spinners: Loading state or awaiting action?
- Text in fields: Placeholder, user-entered, or system-generated?

---

## Create in Linear

After completing all phases, create spec directly in Linear.

### Step 1: Show Preview

```
SPEC READY FOR LINEAR

Title: [SPEC] {Feature Name}
Labels: spec, {ui if hasUI}, {ux if hasUX}

Review Gates (will run at /commit):
- Code Review: Always
- UI Review: {Yes if hasUI | No}
- UX Audit: {Yes if hasUX | No}

Create in Linear?
```

**AskUserQuestion Options:**
- **Create in Linear (Recommended)** - Create issue in Backlog status
- **More refinement** - User provides feedback
- **Abandon** - Don't create

### Step 2: Create Issue

Use Linear API (see [graphql-operations.md](../references/graphql-operations.md)):

```bash
TEAM_ID="05e533b4-661d-43df-84af-bec6f6c38f65"  # PROTOTYPE

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{
    "query": "mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }",
    "variables": {
      "input": {
        "teamId": "'"$TEAM_ID"'",
        "title": "[SPEC] Feature Name",
        "description": "Full spec content in markdown",
        "labelIds": ["cb43bd02-9f5c-4148-a27f-e36f193fa8a8"]
      }
    }
  }' \
  https://api.linear.app/graphql
```

**Labels:**
- `spec`: `cb43bd02-9f5c-4148-a27f-e36f193fa8a8`
- `ui`: `289db0be-5f38-4230-9fad-d3ceb3c88f1a` (if hasUI)
- `ux`: `83a20f96-6adb-4b7d-affc-ff613646b820` (if hasUX)

### Step 3: Create Branch

```bash
ISSUE_ID={created_issue.identifier}  # e.g., DIS-47
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
BRANCH="feature/${ISSUE_ID,,}-${SLUG}"
git checkout -b $BRANCH
```

### Step 4: Report

```
SPEC CREATED IN LINEAR

Issue: {IDENTIFIER}
URL: {issue_url}
Branch: {branch_name}
Status: Backlog (pending approval)

To approve: Move issue to "Todo" in Linear

When implementation begins:
1. Reference the Linear issue during development
2. Run /commit when complete
3. /commit will link PR and move to "Done"
```

### Step 5: Set Session State

```
LINEAR_ISSUE_ID = {issue.id}                    # UUID
LINEAR_ISSUE_IDENTIFIER = {issue.identifier}    # e.g., "DIS-47"
```

---

## Spec Output Format

Use [spec.md template](../templates/spec.md) for the Linear issue description.

### Simple Spec Structure

```markdown
## Summary
{1-2 sentence problem statement}

## Success Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## User Flow
**Entry:** {How user starts}
1. {Step 1}
2. {Step 2}
**Exit:** {How user completes}

## Components
| Component | @ds Path | Notes |
|-----------|----------|-------|
| {Name} | {path} | {notes} |

## Edge Cases
| Scenario | Behavior |
|----------|----------|
| {Case 1} | {What happens} |

## Files
- `{path/to/file.tsx}`

---
hasUI: {true|false}
hasUX: {true|false}
```

### Complex Spec Structure (Phased)

For features needing multiple phases, include phase breakdown:

```markdown
## Summary
{Problem statement}

## Overview
{1-2 paragraphs describing the feature holistically}

## Phases

| # | Phase | Description |
|---|-------|-------------|
| 1 | Setup & Types | Interfaces, types, hooks |
| 2 | Core Components | Main UI components |
| 3 | Integration | Wire up to existing systems |
| 4 | Polish & QA | Edge cases, accessibility |

## Phase 1: Setup & Types
{Detailed tasks for phase 1}

## Phase 2: Core Components
{Detailed tasks for phase 2}

...

## Success Criteria
{High-level acceptance criteria}

---
hasUI: true
hasUX: true
currentPhase: 1
```

---

## Refinement Loop

If "More Refinement" selected:
1. Ask: "What aspects need clarification?"
2. Update spec content based on feedback
3. Re-run preview (max 5 rounds)

---

## Integration Points

| Skill | When | Purpose |
|-------|------|---------|
| /reasoning-first-principles | Phase 1 | Question requirements |
| /building-ui | Phase 2 | Check design system |
| /building-ux | Phase 3 | Review UX flow |
