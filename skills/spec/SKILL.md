---
name: manage-spec
description: Create complete specs through structured interview, push to Linear, generate RalphLoop execution command. Triggers on "spec", "write spec", "create spec", "refine spec", "spec interview".
metadata: {"clawdbot":{"emoji":"📝"}}
---

# Spec Skill

Create complete specs through structured interviews. The spec IS the single source of truth.

## MANDATORY WORKFLOW (DO NOT SKIP)

When /spec is invoked, you MUST complete these phases IN ORDER:

### Phase 0: Directional Interview
- ASK 2-3 questions using AskUserQuestion
- WAIT for responses before proceeding
- OUTPUT: `"[Phase 0/6] Directional interview..."`

### Phase 1: Scout (REQUIRED)
- DEPLOY 1 Explore agent with model: "opus"
- OUTPUT: `"[Phase 1/6] Scout: Estimating complexity..."`
- OUTPUT after: `"[Phase 1/6] Scout complete: ~N files detected. Complexity: {small|medium|large}"`
- NEVER skip this phase

### Phase 2: Explore Agents (REQUIRED)
- COUNT from scout result determines agent count:
  - <5 files → DEPLOY exactly 3 agents
  - 5-10 files → DEPLOY exactly 6 agents
  - 10+ files → DEPLOY exactly 9 agents
- DIMENSIONS: Patterns (1/3), Dependencies (1/3), Edge Cases (1/3)
- DEPLOY in single message with multiple Task tool calls
- OUTPUT: `"[Phase 2/6] Deploying N Explore agents (X Patterns, Y Dependencies, Z Edge Cases)..."`
- OUTPUT after: `"[Phase 2/6] Explore complete. N/N agents returned findings."`
- NEVER proceed until all agents complete

### Phase 3: Plan Agents (REQUIRED, SEQUENTIAL)
- MUST run in exact order: plan-patterns → plan-architecture → plan-edge-cases
- Each agent receives output from previous
- OUTPUT: `"[Phase 3/6] Running plan-patterns agent..."`
- OUTPUT: `"[Phase 3/6] Running plan-architecture agent..."`
- OUTPUT: `"[Phase 3/6] Running plan-edge-cases agent..."`
- NEVER run in parallel

### Phase 4: Master Plan (REQUIRED)
- DEPLOY plan-master agent
- RECEIVES all 3 plan agent outputs
- OUTPUT: `"[Phase 4/6] Running plan-master agent..."`

### Phase 5: Final Interview
- ASK 2-3 rounds of questions
- TOPICS: UI/UX, edge cases, success criteria
- OUTPUT: `"[Phase 5/6] Final interview..."`

### Phase 6: Draft Spec
- USE spec-writer agent
- WRITE to .claude/specs/{slug}/SPEC.md
- OUTPUT: `"[Phase 6/6] Writing spec..."`

## When to Use

- Starting new feature work
- Formalizing a vague request
- Creating a handoff-ready implementation spec
- Refining a blocked spec

## Invocation

```
/spec                      # New spec from scratch
/spec PRO-XXX              # Start from existing Linear ticket
/spec --refine {slug}      # Refine a blocked spec
```

## Spec Lifecycle

| Status | Location | Description |
|--------|----------|-------------|
| draft | `.claude/specs/{slug}.md` | Being refined |
| pending | `.claude/specs/{slug}.md` | Ready for user approval |
| approved | Linear issue description | Pushed, ready for execution |
| blocked | Linear + local | Needs spec refinement |

## Cardinal Rules

1. **Claude NEVER modifies tests to make them pass.** Tests are source of truth.
2. **Spec is THE handoff.** No separate context documents.
3. **All decisions captured in spec.** No decisions.md needed.
4. **Agent storm before interview.** Deploy explore agents, then ask questions.
5. **All agents use Opus.** Quality > cost. "Why use dumb people to plan?"
6. **Zero ambiguity, maximum density.** Every sentence must be unambiguous. Cut fluff ruthlessly.
7. **Never destroy existing spec content.** Read first, Edit (don't Write), append new research.
8. **Two-phase interview.** Directional (2-3 questions) → Agent storm → Final (2-3 rounds).
9. **Checkpoint after spec approval.** After spec-writer completes, MUST invoke `/checkpoint`.
10. **Persist exploration artifacts.** Store in `.claude/specs/{slug}/references/`.

## Complexity Scaling

Scout agent estimates file count, which determines explore agent deployment:

| Estimated Files | Complexity | Explore Agents | Dimensions |
|-----------------|------------|----------------|------------|
| <5 | small | 3 | 1 per dimension |
| 5-10 | medium | 6 | 2 per dimension |
| 10+ | large | 9 | 3 per dimension |

**Dimensions:** Patterns, Dependencies, Edge Cases

**No fast mode.** Thoroughness prevents downstream issues.

## Sizing Tiers

| Tier | Scope | Phases | Files/Phase | Checkpoint Type |
|------|-------|--------|-------------|-----------------|
| 1 | Single file, known pattern | 0 | 1 | None (just do it) |
| 2 | 2-5 files, some exploration | 1-2 | 3-5 | typecheck |
| 3 | Cross-cutting, 5-10 files | 3-5 | 3-5 | typecheck + build |
| 4 | Architectural, 10+ files | 5+ | 3-5 | Full verification + /checkpoint |

**Sizing rule:** Each phase should touch **3-5 files max**. If more files needed, split into sub-phases.

**File count → Tier mapping:**
- 1 file → Tier 1
- 2-5 files → Tier 2
- 5-10 files → Tier 3
- 10+ files → Tier 4

## References

| Topic | File |
|-------|------|
| 7-phase workflow | [workflows.md](references/workflows.md) |
| Two-phase interview | [interview-process.md](references/interview-process.md) |
| Agent configurations | [agents.md](references/agents.md) |
| Usage examples | [examples.md](references/examples.md) |
| Spec template | [spec-format.md](templates/spec-format.md) |
| Question bank | [question-bank.md](../manage-linear/references/question-bank.md) |

## CLI Commands

```bash
SPEC="npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec spec"

# List specs
$SPEC list                    # All specs with status
$SPEC list --status draft     # Filter by status (draft|pending|approved|blocked|completed)

# View spec info
$SPEC info <slug>             # Show spec metadata + path + references

# Status management
$SPEC status <slug> <status>  # Update status (draft|pending|approved|blocked|completed)

# Folder restructure (for large specs)
$SPEC restructure <slug>      # Convert flat spec to folder structure
$SPEC restructure <slug> --dry-run  # Preview without changes

# Reference management (for exploration artifacts)
$SPEC add-reference <slug> <name>           # Add reference (auto-restructures)
$SPEC add-reference <slug> exploration -c "content"
$SPEC list-references <slug>                # List references for spec
$SPEC get-reference <slug> <name>           # View reference content

# Index management
$SPEC index                   # Regenerate INDEX.md from spec files
$SPEC index --check           # Verify INDEX.md is in sync
```

### Folder Structure

When spec exceeds **300 lines** OR has **3+ sessions**, restructure:

```
.claude/specs/{slug}/
├── SPEC.md              # Main spec (core sections only)
├── sessions/
│   ├── session-001.md   # Session logs moved here
│   └── session-002.md
└── references/          # Spec-specific reference materials
```

## Investigation Mode

When refining blocked specs (`--refine`), Claude:
1. Prompts for investigation section updates
2. Auto-suggests files from session exploration (Grep/Read history)
3. Documents working vs broken code paths with file:line refs

See [workflows.md](references/workflows.md) → "Investigation Workflow" for details.
