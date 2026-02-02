# Decision Tracking Workflow

How to track decisions throughout a conversation and handle reversals.

---

## Decision States

| State | Meaning |
|-------|---------|
| `CURRENT` | Active decision that applies now |
| `SUPERSEDED` | Was decided but later reversed/changed |

---

## Detection Patterns

### Detecting Decisions

Scan conversation for these patterns:

```
DECISION_PATTERNS = [
  "decided to {action}",
  "chose {option}",
  "finalized {approach}",
  "will use {thing}",
  "going with {choice}",
  "settled on {option}",
  "confirmed {decision}",
  "agreed to {action}"
]
```

When matched:
1. Extract the decision content
2. Note the rationale if present (look for "because", "since", "due to")
3. Mark as `CURRENT`
4. Track message index for ordering

### Detecting Reversals

Scan for patterns that indicate a previous decision changed:

```
REVERSAL_PATTERNS = [
  "actually, (let's|we should|I'll) {new_action}",
  "instead of {old}, {new}",
  "changed to {new}",
  "no longer {old_decision}",
  "scratch that",
  "on second thought",
  "switching to {new}",
  "revised approach",
  "updated decision"
]
```

When matched:
1. Find the related previous decision
2. Mark previous decision as `SUPERSEDED`
3. Create new decision as `CURRENT`
4. Link them (superseded_by / supersedes)

---

## Tracking Algorithm

```
decisions = []

FOR each message in conversation:
  # Check for new decisions
  FOR each DECISION_PATTERN:
    IF match:
      decision = {
        content: extracted_decision,
        rationale: extracted_rationale or null,
        state: CURRENT,
        message_index: index,
        supersedes: null
      }
      decisions.append(decision)

  # Check for reversals
  FOR each REVERSAL_PATTERN:
    IF match:
      old_decision = find_related_decision(match.old_reference)
      IF old_decision:
        old_decision.state = SUPERSEDED
        new_decision = {
          content: match.new_decision,
          rationale: extracted_rationale or null,
          state: CURRENT,
          message_index: index,
          supersedes: old_decision.id
        }
        old_decision.superseded_by = new_decision.id
        decisions.append(new_decision)
```

---

## Finding Related Decisions

When a reversal is detected, find which previous decision it supersedes:

1. **Keyword matching**: Look for shared terms between old and new
2. **Topic clustering**: Group decisions by topic (architecture, naming, approach)
3. **Recency bias**: If ambiguous, prefer most recent related decision
4. **Explicit reference**: If reversal mentions specific decision, use that

Example:
```
Message 5: "Decided to use PostgreSQL for the database"
Message 12: "Actually, let's use SQLite instead for simplicity"

→ Message 12 supersedes Message 5 (both about database choice)
```

---

## Checkpoint Output

Output as flat list with inline rationale:

```markdown
## Decisions
- Using SQLite because simpler for prototype
- Component-based architecture because matches existing patterns

*2 decisions superseded during session (not shown)*
```

### With History (--verbose flag)

Include superseded decisions for context:

```markdown
## Decisions

**Current:**
- Using SQLite because simpler for prototype

**Superseded:**
- ~~PostgreSQL for database~~ → Changed to SQLite
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Multiple reversals of same topic | Chain: A → B → C (only C is CURRENT) |
| Partial reversal | Create new decision, mark only affected part as SUPERSEDED |
| Implicit reversal (no explicit pattern) | Don't auto-detect; keep both as CURRENT |
| User explicitly marks decision | Trust user, update state accordingly |

---

## Integration with Context Gathering

Decision tracking runs as part of Step 2 (Gather Context):

```
Step 2: Gather Context
  2a. Extract decisions using DECISION_PATTERNS
  2b. Detect reversals using REVERSAL_PATTERNS
  2c. Resolve decision states (CURRENT vs SUPERSEDED)
  2d. Extract files, questions, next steps (unchanged)
```
