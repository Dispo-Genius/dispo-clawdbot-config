---
name: checkpoint
description: Save session progress to Linear and generate a handoff prompt. Triggers on "checkpoint", "save progress", "hand off", "new chat", "context getting large". Prompts to commit uncommitted changes first.
---

# Checkpoint Skill

Save session progress to Linear and generate a handoff prompt for continuing in a new chat.

> **Note:** Checkpoint is primarily for **context management** - preserving session state for handoff to a new chat. It will prompt to commit uncommitted changes first (use `--no-commit` to skip, or `--commit` to always commit).

## When to Use

- Context window getting large (conversation > 50 messages)
- Switching topics or projects mid-session
- Before ending a long session
- User says "checkpoint", "save progress", "hand off"
- Proactively offer when detecting topic drift
- When you have code changes AND want to save context (will prompt to commit)

---

## CRITICAL RULES

> **SPEC FILE IS THE SOURCE OF TRUTH**
> - ALL session knowledge, decisions, and context go to the **spec file**
> - The plan file is ONLY for the handoff prompt
> - NEVER write spec content to the plan file

> **DETECT SPEC FIRST**
> - Spec detection MUST happen BEFORE ticket detection
> - The spec file may contain the ticket ID, so find it first

> **CONTENT DESTINATIONS**
> | Content Type | MUST Go To | NEVER Goes To |
> |--------------|------------|---------------|
> | Session log (decisions, files, blockers) | **Spec file** | Plan file |
> | Acceptance criteria updates | **Spec file** | Plan file |
> | Handoff prompt ONLY | **Plan file** | Spec file |
> | Brief checkpoint comment | **Linear** | - |

> **PLAN FILE HYGIENE**
> - ALWAYS clear plan file before writing handoff (prevents spec content accumulation)
> - Plan file must contain ONLY the handoff prompt template
> - If previous content exists, OVERWRITE completely - never append
> - Validate after writing: plan file should NOT contain `## Session Log`, `### Decisions Made`, full file lists

---

## Invocation

```
/checkpoint                    # Auto-detect ticket, writes handoff to plan file
/checkpoint DIS-322            # Target specific ticket
/checkpoint --commit           # Commit changes first, then checkpoint
/checkpoint --no-commit        # Skip commit prompt (context only)
/checkpoint --clear-plan       # Clear plan file after (rarely needed)
/checkpoint --slack            # Also post summary to Slack
```

> **New:** Handoff is written to plan file. Click "Clear context and start new chat" to continue.

---

## Workflow Overview

| Step | Action | Key Tool |
|------|--------|----------|
| 0 | Initialize checklist | TaskCreate |
| 1 | Detect active spec file | Glob `.claude/specs/` |
| 1.5 | Check spec size (restructure if >300 lines) | wc -l |
| 2 | Detect active ticket | linear-cc |
| 3 | Check uncommitted changes | git status |
| 4 | Gather context + detect completion/spec-in-progress state | Conversation scan |
| 5 | Track decisions | Pattern matching |
| 6 | Check for spec changes | linear-cc |
| 7 | Update spec file + post Linear comment | Write, linear-cc |
| 7.5 | Create sub-issues for next steps | linear-cc |
| 8 | Write handoff to plan file | EnterPlanMode, Write, ExitPlanMode |
| 9 | Clear plan file (only if `--clear-plan`) | Write |

**Full step details:** [references/workflow-steps.md](./references/workflow-steps.md)

---

## Quick Reference

### Step 1: Find Spec File
Search order: argument → recent access → branch name → glob `.claude/specs/*.md`
Auto-create if ticket known but no spec exists.

### Step 2: Find Ticket
Extract from spec filename or content. Fallback: conversation, branch, ask user.

### Step 3: Commit Check
If uncommitted changes and no `--no-commit`: ask user. Run typecheck+build before commit.

### Step 4: Gather Context
Extract: original ask, approach, remaining work, files touched, decisions, blockers.
Detect if task COMPLETED vs ONGOING vs SPEC_IN_PROGRESS for Step 8 branching.
**Spec-in-progress:** If `/spec` was running (phases 0-6 not all complete), saves artifacts and sets state so handoff continues the spec process.

### Step 5-6: Decisions & Spec Changes
Track current vs superseded decisions. Update Linear description if spec changed.

### Step 7: Update Spec + Linear
Append session log to spec file. Post brief comment to Linear.

### Step 8: Write Handoff
- **COMPLETED:** Clear plan file, skip ExitPlanMode
- **SPEC_IN_PROGRESS:** Use spec-continuation template — handoff MUST instruct new chat to continue `/spec` from last completed phase (do NOT start implementation)
- **ONGOING:** EnterPlanMode → Write handoff → ExitPlanMode

---

## Templates

- [templates/linear-comment.md](./templates/linear-comment.md) - `[CHECKPOINT]` comment format
- [templates/handoff-prompt.md](./templates/handoff-prompt.md) - Knowledge transfer prompt

## Workflows

- [workflows/ticket-detection.md](./workflows/ticket-detection.md) - How to find the right ticket
- [workflows/decision-tracking.md](./workflows/decision-tracking.md) - Handle decision reversals
- [workflows/ralphloop-detection.md](./workflows/ralphloop-detection.md) - Auto-continue for bounded work

---

## Integration Points

| System | Integration |
|--------|-------------|
| Spec files | **Primary context storage** - update `.claude/specs/{slug}.md` with Session Log |
| Linear | Post brief checkpoint comment for timeline visibility, create sub-issues via `linear-cc` |
| Slack | (Optional) Post summary via `slack-cc` |
| Plan file | **Write handoff content** (enables native "Clear context" flow) |
| TaskCreate/TaskUpdate | Clear tasks after checkpoint |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No ticket detected | Ask user which ticket to use |
| Multiple tickets found | List them, let user choose |
| Linear API failure | Warn, still generate handoff prompt |
| Plan file doesn't exist | Skip clearing step |
| Slack failure | Warn and continue |
| Spec update fails | Warn, continue with comment only |

---

## Examples

**Basic checkpoint:**
```
User: /checkpoint
Claude: Detected DIS-322 from conversation.
        ✓ Spec file updated
        ✓ Comment posted to Linear
        ✓ Handoff written to plan file
```

**With spec update:**
```
User: /checkpoint DIS-360
Claude: Detected spec changes:
        - Added acceptance criteria for decision tracking
        ✓ Description updated
        ✓ Comment posted to DIS-360
```

**Task completed:**
```
User: /checkpoint
Claude: Task appears complete (all todos done).
        ✓ Checkpoint saved to Linear
        ✓ Plan file cleared
        No handoff needed.
```
