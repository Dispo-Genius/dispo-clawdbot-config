# Interview Process

Two-phase interview pattern for agent storm spec creation.

## Overview

The interview is split into two phases:

| Phase | When | Purpose | Questions |
|-------|------|---------|-----------|
| **Directional** | Before exploration | Guide agent deployment | 2-3 questions |
| **Final** | After synthesis | Confirm and fill gaps | 2-3 rounds |

Most exploration happens via agents, not user questions.

---

## Phase 1: Directional Interview

**Goal:** Gather enough context to deploy scout and explore agents effectively.

### Questions (2-3 max)

1. **Area:** "What area of the app does this involve?"
   - Options: specific areas from codebase (e.g., "Investor Prospecting", "Listings", "Messages")
   - Purpose: Narrow exploration scope

2. **Core Problem:** "What's the core problem or improvement?"
   - Free text or options based on ticket type
   - Purpose: Focus exploration on relevant patterns

3. **References (optional):** "Any existing patterns or components to reference?"
   - Only ask if user's description mentions "like X" or "similar to Y"
   - Purpose: Seed exploration with known good examples

### Rules

- **No deep dives** - Exploration handles depth
- **Bias toward action** - Get enough to start, refine later
- **Surface unknowns** - If user says "I don't know", that's valuable signal

### Example

```
User: /spec

Claude: Let me get some direction before exploring.

DIRECTIONAL INTERVIEW
━━━━━━━━━━━━━━━━━━━━━

AskUserQuestion({
  questions: [{
    header: "App area",
    question: "What area of the app does this involve?",
    options: [
      { label: "Investor Prospecting", description: "Prospect cards, filters, outreach" },
      { label: "Listings", description: "Property listings, details, messages" },
      { label: "Messages", description: "Conversations, email threads" },
      { label: "Other", description: "Specify area" }
    ]
  }, {
    header: "Core change",
    question: "What's the core problem or improvement?",
    options: [
      { label: "Add feature", description: "New capability" },
      { label: "Fix bug", description: "Something broken" },
      { label: "Improve UX", description: "Better experience" },
      { label: "Performance", description: "Faster/lighter" }
    ]
  }]
})
```

---

## Phase 2: Final Interview

**Goal:** Confirm exploration findings and fill remaining gaps.

Runs after master plan agent synthesizes all exploration.

### Round 1: UI/UX Confirmation

Present what exploration found:

```
Exploration found these patterns in the investor area:
- Modal for edit flows (FilterModal, EditInvestorModal)
- Cards for list items (InvestorCard, PropertyCard)
- Footer actions pattern (primary right, secondary left)

Does this approach match your expectation?
```

Questions:
- Confirm UI pattern choice
- Any interaction specifics not covered
- Loading/empty/error state preferences

### Round 2: Edge Cases Confirmation

Present gaps identified by plan-edge-cases agent:

```
Exploration identified these gaps:
- No handling for: network timeout during save
- No handling for: concurrent edits by multiple users

How should we handle these?
```

Questions:
- Decision on each identified gap
- Any additional edge cases user knows about
- Priority: must-handle vs nice-to-have

### Round 3: Success Criteria

Finalize what "done" means:

```
Based on exploration and your answers:
- {N} files to modify
- {M} edge cases to handle
- Pattern: {chosen pattern}

What does "done" look like?
```

Questions:
- Specific success criteria
- What should NOT happen
- Any tests that prove it works

---

## AskUserQuestion Rules

### Always Include Recommendation

Add `(Recommended)` to first option based on:
- Exploration findings (most consistent pattern)
- Codebase conventions
- Simplest approach

```typescript
AskUserQuestion({
  question: "What layout pattern?",
  options: [
    { label: "Modal (Recommended)", description: "Matches existing edit flows" },
    { label: "Full page", description: "For complex multi-step flows" }
  ]
})
```

### Never Skip - Confirm Instead

Even when exploration is conclusive:

```typescript
// BAD - Skipping because only Modal exists
"Using Modal pattern since that's what the area uses."

// GOOD - Confirm the obvious
AskUserQuestion({
  question: "The investor area uses Modal exclusively. Confirm?",
  options: [
    { label: "Yes, Modal (Recommended)", description: "Consistent with area" },
    { label: "Different approach", description: "Override pattern" }
  ]
})
```

---

## Handling Scope Changes

If exploration reveals larger scope than directional interview suggested:

```
⚠️ Scope Assessment

Directional interview suggested: ~5 files
Exploration found: ~12 files

Additional areas discovered:
- {area}: {why needed}
- {area}: {why needed}

Options:
1. Continue with full scope (Recommended if time allows)
2. Split into phases
3. Descope to original estimate
```

Use AskUserQuestion - don't decide unilaterally.

---

## Synthesis Visibility

After exploration, share findings:

```
From {N} explore agents:
- Found {component} pattern at {file:line}
- Dependencies: {list}
- Gaps: {list}

Master plan recommends: {summary}
```

This builds trust and helps user give better final interview answers.

---

## Complexity Adaptation

| Complexity | Directional | Explore Agents | Final Interview |
|------------|-------------|----------------|-----------------|
| Small (<5 files) | 2 questions | 3 agents | 2 rounds |
| Medium (5-10) | 3 questions | 6 agents | 3 rounds |
| Large (10+) | 3 questions | 9 agents | 3 rounds |

Final interview adapts to exploration depth, not complexity tier.

---

## Interview Anti-Patterns

### DON'T: Deep dive in directional phase

```
# BAD - Too many questions before exploration
Round 1: Problem (4 questions)
Round 2: Solution (4 questions)
Round 3: UI/UX (4 questions)
Round 4: Edge Cases (5 questions)
Round 5: Success (3 questions)
```

### DON'T: Skip final interview

```
# BAD - Trusting exploration blindly
"Exploration complete. Drafting spec..."
```

### DON'T: Ask what agents should find

```
# BAD - User shouldn't do exploration work
"What components exist in this area?"
"What error patterns does this area use?"
```

### DO: Let agents explore, user confirms

```
# GOOD - Exploration then confirmation
Agents explore → Synthesis → User confirms/adjusts
```
