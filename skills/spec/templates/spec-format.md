# Spec Format

Template for spec files at `.claude/specs/{slug}.md`.

---

## Template

```markdown
# {Title}

**Status:** draft | pending | approved | blocked
**Linear:** {PRO-XXX or empty}

## Problem
What is broken/missing/suboptimal? Who is affected?

## Goal
Single sentence: what success looks like.

## Acceptance Criteria

### Automated (Claude verifies)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run test` passes (if tests exist)

### Visual (use agent-browser)
- [ ] {What to verify}
  ```bash
  agent-browser open "http://localhost:3000/{path}"
  agent-browser screenshot /tmp/verify-{slug}.png
  ```
  Read screenshot, verify: {criterion}

### Manual (Human verifies)
- [ ] [Non-visual behavior - Claude stops, human checks]

## Solution
Technical approach (1-2 paragraphs). Why this over alternatives.

## Files to Modify
- `src/path/file.tsx` - what changes

## Phases (for Tier 2+ tasks)

### Phase 1: [Name]
**Deliverable:** [What gets produced]
**Files:** [List 3-5 files]
**Exit criteria:**
- [ ] `npm run typecheck` passes
- [ ] `/checkpoint` completed

Tasks:
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
...

## Edge Cases (if applicable)
| Scenario | Behavior |
|----------|----------|

## Blocker (if blocked)
[What stopped execution, what needs to be clarified]

## Investigation (if blocked)

### Code Flow
**Working Path:**
1. `{file.tsx:line}` - {description}

**Broken Path:**
1. `{file.tsx:line}` - {description}

### Code References
- `{file.tsx:line}` - {why relevant}

### What We Tried
- {Approach} - {outcome}

## Session Log

### Session {N} - {YYYY-MM-DD}
**Status:** {In Progress | Blocked | Near Complete}

**Progress:**
- {What was done}

**Decisions:**
- {Decision} because {rationale}

**Next:**
- {Remaining work}

## References

See `references/` folder for exploration artifacts:
- `exploration.md` - Agent exploration findings
- `synthesis.md` - Plan agent synthesis
```

---

## Field Guidelines

### Status Values

| Status | Meaning | Location |
|--------|---------|----------|
| `draft` | Being refined via interview | Local only |
| `pending` | Ready for user approval | Local only |
| `approved` | Pushed to Linear, ready for execution | Linear issue |
| `blocked` | Execution hit unresolvable issue | Linear + local |

### Acceptance Criteria

**Automated criteria** - commands that return exit code 0/1:
- `npm run typecheck`
- `npm run build`
- `npm run test`
- Any other command with deterministic pass/fail

**Visual criteria** - Claude verifies using agent-browser with explicit commands:
```bash
agent-browser open "http://localhost:3000/{path}"
agent-browser screenshot /tmp/verify-{slug}.png
```
Then read screenshot and verify:
- UI elements appear correctly
- Layout matches expectation
- States render properly (empty, loading, error, success)
- Colors, spacing, typography match design system

**Manual criteria** - human must verify:
- Animation feels right (timing, easing)
- UX flow is intuitive (subjective judgment)
- Business logic is correct (domain expertise)
- Behavior requires real user interaction

### Slug Naming

Auto-generate from title:
- `Add dark mode` → `add-dark-mode.md`
- `Fix login bug` → `fix-login-bug.md`
- `Improve search performance` → `improve-search-performance.md`

Lowercase, hyphens for spaces, no special characters.

### Conciseness Rules

- **Problem:** 1-2 sentences max
- **Goal:** Single sentence, no qualifiers
- **Solution:** 1-2 paragraphs max, bullet points preferred
- **Each task:** Single verb phrase (e.g., "Add X to Y", not "We should consider adding X...")
- **No filler words:** "basically", "essentially", "in order to", "actually"

### Zero Ambiguity Checklist

Before marking spec as `pending`:
- [ ] Every noun is specific (no "the component", "the data" - name it)
- [ ] Every action is concrete (no "handle", "process", "manage" - what exactly?)
- [ ] Every acceptance criterion is testable (if human can't verify it, rewrite)
- [ ] No conditionals without specified behavior ("if X happens" → "if X happens, then Y")

### Session Log

Added by `/checkpoint` to track session progress. Append-only - never delete previous sessions.

| Field | Purpose |
|-------|---------|
| **Session N** | Incrementing session number |
| **Status** | In Progress, Blocked, or Near Complete |
| **Progress** | What was accomplished this session |
| **Decisions** | Key decisions with rationale (for context) |
| **Next** | Remaining work for handoff |

---

## Minimal Spec (Simple Features)

```markdown
# {Title}

**Status:** draft
**Linear:**

## Problem
{1-2 sentences}

## Goal
{Single sentence}

## Acceptance Criteria

### Automated
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes

### Visual (use agent-browser, if applicable)
- [ ] {What to verify}
  ```bash
  agent-browser open "http://localhost:3000/{path}"
  agent-browser screenshot /tmp/verify-{slug}.png
  ```
  Read screenshot, verify: {criterion}

### Manual
- [ ] {Non-visual behavior}

## Solution
{1 paragraph}

## Files to Modify
- `{path}` - {change}
```

---

## Full Spec (Complex Features)

Include all sections from template, plus:
- Multiple edge cases
- Multiple manual criteria
- Interaction flow table (if multi-step)
- Dependencies (if blocked by other work)
- Session Log (added by `/checkpoint` during execution)
