# Spec Examples

## New Spec with Agent Storm

```
User: /spec

Claude: Let me get some direction before deploying agents.

DIRECTIONAL INTERVIEW
━━━━━━━━━━━━━━━━━━━━━

AskUserQuestion: What area? What's the core problem?

User: Investor Prospecting - add bulk selection for outreach

Claude: Deploying scout agent...

Scout found ~8 files. Deploying 6 explore agents...
- 2 for Patterns
- 2 for Dependencies
- 2 for Edge Cases

[Agents explore in parallel]

From 6 explore agents:
- Found: InvestorCard bulk pattern at ProspectingView.tsx:145
- Found: useSelection hook at hooks/useSelection.ts
- Gap: No bulk action menu component exists

Running plan agents sequentially...
- plan-patterns → plan-architecture → plan-edge-cases

Master plan synthesis complete.

FINAL INTERVIEW (Round 1/3)
━━━━━━━━━━━━━━━━━━━━━━━━━━

Exploration found checkbox selection pattern in InvestorCard.
Recommend: Add checkboxes + floating action bar.

AskUserQuestion: Confirm this UI approach?

[Interview continues for 2-3 rounds]

Claude: Spec written to .claude/specs/add-bulk-selection/SPEC.md
        References saved to .claude/specs/add-bulk-selection/references/
```

## From Existing Ticket

```
User: /spec PRO-123

Claude: Loaded PRO-123: "Improve search performance"

        Running abbreviated directional interview...

AskUserQuestion: Which searches to optimize?

User: Investor name search

Claude: Deploying scout...

Scout found ~4 files. Deploying 3 explore agents...

[Standard workflow continues]
```

## Refine Blocked Spec

```
User: /spec --refine add-bulk-selection

Claude: Loading spec from .claude/specs/add-bulk-selection/SPEC.md

        **Blocker:** Checkbox state lost on scroll

        Running focused exploration (3 agents on edge cases)...

[Abbreviated storm focused on blocker]

Claude: Found: virtualized list resets state at ProspectingView.tsx:89
        Recommendation: Lift selection state to parent

FINAL INTERVIEW (focused)
━━━━━━━━━━━━━━━━━━━━━━━━

AskUserQuestion: Confirm lifting state to ProspectingView?

[Quick confirmation]

Claude: Spec updated. Ready to re-approve?
```

---

## Agent Deployment Example

```typescript
// Phase 1: Scout
Task({
  description: "Scout complexity",
  prompt: "Estimate complexity for: add bulk selection...",
  subagent_type: "Explore",
  model: "opus"
})
// Returns: ~8 files, medium complexity

// Phase 2: Explore (6 agents in parallel)
Task({ prompt: "Explore PATTERNS...", subagent_type: "Explore", model: "opus" })
Task({ prompt: "Explore PATTERNS (related)...", subagent_type: "Explore", model: "opus" })
Task({ prompt: "Explore DEPENDENCIES...", subagent_type: "Explore", model: "opus" })
Task({ prompt: "Explore DEPENDENCIES (APIs)...", subagent_type: "Explore", model: "opus" })
Task({ prompt: "Explore EDGE CASES...", subagent_type: "Explore", model: "opus" })
Task({ prompt: "Explore EDGE CASES (boundaries)...", subagent_type: "Explore", model: "opus" })

// Phase 3: Plan (sequential)
const patterns = await Task({ subagent_type: "plan-patterns", model: "opus" })
const arch = await Task({ subagent_type: "plan-architecture", model: "opus" })
const edges = await Task({ subagent_type: "plan-edge-cases", model: "opus" })

// Phase 4: Master
Task({ subagent_type: "plan-master", model: "opus" })
```

---

## Folder Structure After Storm

```
.claude/specs/add-bulk-selection/
├── SPEC.md              # Main spec
└── references/
    ├── exploration.md   # Raw exploration findings
    └── synthesis.md     # Plan agent synthesis
```

---

## Integration Points

| System | Integration |
|--------|-------------|
| Linear | Create issue, update description, post comments |
| Codebase | Explore agents find relevant files |
| Plan agents | Synthesize findings into guidance |
| spec-writer | Write spec + references to folder |
| /checkpoint | Session handoff after approval |
