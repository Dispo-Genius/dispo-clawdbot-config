# Termination Criteria

Explicit decision points for when to stop researching.

---

## The Problem

Research agents often fail to recognize when to stop. They either:
- **Over-research:** Keep searching long after sufficient information is found
- **Under-research:** Stop too early, missing critical information
- **Rabbit-hole:** Follow tangential threads endlessly

This document defines explicit termination gates at each phase.

---

## Phase-Level Termination

### Phase 0: Query Analysis

**Terminate when:**
- Research plan is complete with 2-5 dimensions
- Success criteria are defined
- Agent allocation is determined

**Max duration:** 1 minute

**Cannot proceed without:**
- At least 2 research dimensions
- Clear success criteria

---

### Phase 1: Initial Research

**Per-Agent Termination:**

| Condition | Action |
|-----------|--------|
| 5-10 searches completed | Consider stopping |
| Same results appearing | Stop searching |
| Key questions answered | Stop |
| Max 10 searches reached | Forced stop |

**Phase Termination:**
- All agents complete OR timeout (5 min each)
- Max phase duration: 3 minutes total

**Quality Gate:**
Before proceeding to Phase 2, check:
- At least 50% of dimensions have findings
- At least 5 unique sources identified

---

### Phase 2: Verification Pipeline

**Terminate when:**
- All three verification agents complete
- Max phase duration: 2 minutes

**Cannot skip:**
- If fact-check finds 0 verifiable claims, escalate to user
- Verification must run even with partial Phase 1 results

---

### Phase 3: Gap Analysis

**Termination Decision Matrix:**

```
┌─────────────────────────────────────┬──────────────────────┐
│ Situation                           │ Decision             │
├─────────────────────────────────────┼──────────────────────┤
│ All critical questions answered     │ → SYNTHESIS          │
│ Only nice-to-have gaps remain       │ → SYNTHESIS          │
│ Confidence > 80% on key claims      │ → SYNTHESIS          │
│ 1-2 critical gaps identified        │ → DEEP DIVE          │
│ 3+ critical gaps identified         │ → DEEP DIVE (max 3)  │
│ >50% dimensions incomplete          │ → ESCALATE TO USER   │
└─────────────────────────────────────┴──────────────────────┘
```

**Forced Synthesis Conditions:**
- Already completed one deep dive round
- Total research time exceeds 8 minutes
- User requested quick mode

---

### Phase 4: Deep Dive

**Per-Agent Termination:**

| Condition | Action |
|-----------|--------|
| Gap resolved with high confidence | Stop |
| 10+ searches with <10% new info | Stop (diminishing returns) |
| Primary sources found | Stop |
| Max 15 searches reached | Forced stop |

**Diminishing Returns Detection:**

```
Track: newInfoRate = (novel findings) / (total findings)

If last 3 searches:
  newInfoRate < 10% → Stop, proceed to synthesis
```

**Phase Termination:**
- Max 2 iterations of deep dive
- Max phase duration: 3 minutes total
- If gaps still critical after 2 rounds: document as limitation

---

### Phase 5: Synthesis

**Terminate when:**
- All findings unified
- Contradictions resolved OR documented
- Pre-mortem completed
- Max duration: 2 minutes

**Cannot proceed without:**
- At least one verified finding
- Pre-mortem analysis

---

### Phase 6: Report Generation

**Terminate when:**
- Report written to `.claude/research/{slug}.md`
- All sections completed
- Max duration: 1 minute

---

## Decision Trees

### Should I Keep Searching?

```
Have I found an answer to the core question?
├── Yes → Do I have multiple sources?
│         ├── Yes → Do they agree?
│         │         ├── Yes → STOP
│         │         └── No → Search for tiebreaker, then STOP
│         └── No → Search for confirmation (max 3 more)
└── No → Have I done 10+ searches?
          ├── Yes → STOP, flag as gap
          └── No → Continue searching
```

### Should I Do Deep Dive?

```
Are there critical gaps?
├── No → SKIP deep dive, go to synthesis
└── Yes → How many?
          ├── 1-3 → Deep dive on top 3
          └── 4+ → Deep dive on top 3, document rest as limitations
```

### Should I Continue Deep Dive?

```
Did this round yield significant new information?
├── Yes (>10% new) → Continue if gaps remain
└── No (<10% new) → STOP, proceed to synthesis
```

---

## Time Budgets

| Phase | Max Duration | Strictness |
|-------|--------------|------------|
| Phase 0: Query Analysis | 1 min | Soft |
| Phase 1: Initial Research | 3 min | Hard |
| Phase 2: Verification | 2 min | Hard |
| Phase 3: Gap Analysis | 30 sec | Soft |
| Phase 4: Deep Dive | 3 min | Hard |
| Phase 5: Synthesis | 2 min | Soft |
| Phase 6: Report | 1 min | Soft |
| **Total** | **~12 min** | |

**Quick Mode Budgets:**
- Phase 1: 1.5 min
- Phase 2: 1 min (skip credibility)
- Phase 4: Skip entirely
- **Total:** ~5 min

---

## Completeness Thresholds

### Minimum Viable Research

Before declaring research complete:

| Metric | Threshold | Impact if Not Met |
|--------|-----------|-------------------|
| Dimensions covered | ≥ 80% | Document gaps |
| Claims verified | ≥ 60% | Lower confidence |
| Sources consulted | ≥ 5 | Seek more |
| High-credibility sources | ≥ 30% | Lower confidence |

### Quality vs Completeness

```
If time budget exceeded:
  1. Check if core question is answered
  2. If yes → Proceed with current findings
  3. If no → Brief extension (1 min) or escalate

Prefer: Confident partial answer > uncertain complete answer
```

---

## Escalation to User

### When to Ask

- Research blocked (all searches fail)
- Contradictory findings can't be resolved
- Query is ambiguous after analysis
- Critical dimension completely unanswered

### How to Ask

```markdown
⚠️ Research requires clarification:

**Issue:** {description}

**Options:**
1. {option 1}
2. {option 2}
3. Continue with limitations documented

Which approach should I take?
```

---

## Anti-Patterns

### Over-Research Symptoms

- Same sources appearing repeatedly
- Searches yielding no new information
- Going beyond original scope
- Following tangential threads

**Fix:** Apply diminishing returns check after each search

### Under-Research Symptoms

- Core question not addressed
- Single source for critical claims
- Major dimensions unexplored
- Confidence very low

**Fix:** Check quality gates before proceeding

### Rabbit-Hole Symptoms

- Research veering off-topic
- Following interesting but irrelevant threads
- Scope creep in search terms

**Fix:** Check relevance to original query after each search
