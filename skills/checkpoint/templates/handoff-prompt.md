# Handoff Prompt Template

Streamlined format for knowledge transfer to new chats. Designed to trigger immediate context-gathering behavior.

---

<template name="handoff-prompt">
```markdown
# Continuing: {TICKET} - {Brief Title}

**Your task:** {one-line action statement}

**Spec:** `{SPEC_PATH}` ← Read this FIRST

You are continuing a previous session. First, gather context:

## 1. Read Spec

{IF FOLDER SPEC}
This is a **folder spec**. Read the main file:
```bash
Read {SPEC_PATH}/SPEC.md
```

**Check these sections in order:**
1. **Decisions** - Preserved institutional knowledge (don't redo these)
2. **Quick Context** - Current state snapshot
3. **Session History** - Table of all sessions

For full session details: `{SPEC_PATH}/sessions/session-{NNN}.md`
{END IF}

{IF SINGLE FILE SPEC}
```bash
Read {SPEC_PATH}
```

**Do NOT search** - use this exact path. Check the **Decisions** and **Session Log** sections.
{END IF}

## 2. Check Linear Status
```bash
npx tsx .claude/tools/linear-cc/src/index.ts get-issue {TICKET}
```

## 3. Explore Codebase
Use {N} Explore agent(s) to review these files:
- `{path}` - {purpose/what changed}

## 4. Check Existing Tasks
Run `TaskList` first - incomplete tasks persist across sessions.

{OPTIONAL if new tasks needed}
Use TaskCreate to add:
- {task 1}
- {task 2}
{END OPTIONAL}

## Current State
**Status:** {In Progress | Blocked | Near Complete}

{1-2 sentences: What was done and what needs to happen next}

## Decisions (Don't Redo)
- {Decision} because {rationale}

## Watch Out
- {Issue or gotcha}

{OPTIONAL: Include RalphLoop section if remaining work is bounded + verifiable}

## Auto-Continue (RalphLoop)

Remaining work is bounded with programmatic verification.
Run in a separate terminal:

\`\`\`bash
cd {project_dir} && \
MAX_ITER=10 ITER=0 && \
while [ $ITER -lt $MAX_ITER ] && ! {verify_command}; do
  claude --print "{prompt}"
  ITER=$((ITER + 1))
done && echo "✓ Done!" || echo "⚠ Max iterations reached"
\`\`\`

**Stop condition:** `{verify_command}` returns success
**Safety:** Max 10 iterations

{END OPTIONAL}
```
</template>

---

<guidelines for="handoff-prompt">

### Framing

- Use "Continuing" language throughout - the agent is resuming, not starting fresh
- "You are continuing a previous session" - explicit instruction
- Numbered steps (1, 2, 3, 4) tell agent what to do IMMEDIATELY
- Don't bury actions in prose - make them executable

### 1. Read Spec (MANDATORY)

- **Spec is primary context source** - contains decisions, session history, next steps
- Agent should read this BEFORE doing anything else
- **Use the exact path** from checkpoint (don't search)

**Two spec formats:**

| Format | Path Pattern | Main File |
|--------|--------------|-----------|
| Single file | `.claude/specs/{slug}.md` | The file itself |
| Folder | `.claude/specs/{slug}/` | `SPEC.md` inside |

**For single-file specs:**
```
Read {SPEC_PATH}
```

**For folder specs:**
```
Read {SPEC_PATH}/SPEC.md
```
- Check **Decisions** section FIRST - these are institutional knowledge
- Check **Quick Context** for current state
- Full session logs in `sessions/` subfolder

Example paths:
- Single: `Read .claude/specs/improve-checkpoint-dis-400.md`
- Folder: `Read .claude/specs/improve-checkpoint-dis-400/SPEC.md`

### 2. Check Linear Status (MANDATORY)

- Get ticket status, description, and any comments
- Linear is for tracking, spec file is for context

```bash
npx tsx .claude/tools/linear-cc/src/index.ts get-issue {TICKET}
```

### 3. Explore Codebase (when files listed)

- Tell the agent how many Explore agents to spawn
- Include file paths with purpose

**Explore agent count guidance:**
| Files | Agent Count | Rationale |
|-------|-------------|-----------|
| 1-2 files | 1 agent | Single agent can handle |
| 3-5 files | 2 agents | Parallel exploration faster |
| 6+ files or multiple modules | 3 agents | Distribute across modules |

Example:
```markdown
Use 2 Explore agents to review these files:
- `src/services/transformer.py` - price history extraction logic
- `src/db/models.py` - property schema
- `src/utils/dates.py` - date parsing helpers
```

### 4. Add Tasks (when remaining work exists)

- List concrete tasks for TaskCreate
- These become the agent's immediate work queue
- Imperative form: "Fix X", "Add Y", "Test Z"
- Skip if task is singular/obvious from Start section

Example:
```markdown
Use TaskCreate to add these tasks:
- Run standardization on FL search data
- Run standardization on TX search data
- Verify output counts match input
```

### Current State

- **Status:** One of `In Progress`, `Blocked`, `Near Complete`
- 1-2 sentences: accomplishments + immediate next step
- Be specific: "Fixed price_history bugs. Now run full pipeline."

### Decisions (Don't Redo)

**CRITICAL: These preserve institutional knowledge.**

- Flat list - no hierarchy
- Include rationale inline: `{decision} because {reason}`
- Only include decisions that would be tempting to revisit
- Skip obvious or trivial decisions

**For folder specs:** The Decisions table in SPEC.md is the authoritative source. The handoff should reference it:
```markdown
## Decisions (Don't Redo)
See **Decisions** table in spec file. Key ones:
- {Most important decision} because {rationale}
```

### Your task (MANDATORY)

- One-line action statement at the very top
- This is the CTA - tells agent exactly what to accomplish
- Imperative form: "Implement X", "Fix Y", "Run Z"
- Agent should be able to execute without asking "what should I do?"

Example:
```markdown
**Your task:** Run standardization pipeline on full 4.4k REAPI properties
```

### Watch Out

- Blockers, gotchas, edge cases
- Things the new session needs to be aware of
- OK to omit if none

### Auto-Continue (RalphLoop)

**Include this section ONLY when remaining work is:**
- Bounded (finite, countable tasks)
- Programmatically verifiable (typecheck, tests, build, lint)
- Deterministic (no human judgment needed)

**Ralph-able signals:**
| Signal | Verification Command |
|--------|---------------------|
| Type errors | `npm run typecheck` |
| Test failures | `npm run test` |
| Build errors | `npm run build` |
| Lint errors | `npm run lint` |

**NOT Ralph-able (skip section):**
- Design/architecture decisions
- Exploratory research
- UI/UX work requiring visual review
- Anything needing human judgment

**Multiple verifications:** Chain with `&&` (e.g., `npm run typecheck && npm run test`)
</guidelines>

---

<examples for="handoff-prompt">

**Example 1: Multi-file feature work**

```markdown
# Continuing: PRO-266 - Property Data Pipeline

**Your task:** Implement error handling with exponential backoff for property API

You are continuing a previous session. First, gather context:

## 1. Read Spec File
```bash
Read /Users/dev/project/.claude/specs/property-data-pipeline.md
```

Check the **Session Log** section for recent progress, decisions, and next steps.

## 2. Check Linear Status
```bash
npx tsx .claude/tools/linear-cc/src/index.ts get-issue PRO-266
```

## 3. Explore Codebase
Use 2 Explore agents to review these files:
- `src/services/propertyLookup.ts` - Core API integration
- `src/services/batchProcessor.ts` - Batch processing logic
- `src/db/errors.ts` - Error logging schema

## 4. Add Tasks
Use TaskCreate to add these tasks:
- Add retry logic with exponential backoff
- Implement rate limiting (100 req/min)
- Migrate error logging schema

## Current State
**Status:** In Progress

Completed batch processing and API integration. Now implementing error handling with exponential backoff.

## Decisions (Don't Redo)
- Using Redfin API because only source with sufficient market coverage
- SQLite for caching because simpler for prototype phase
- 100 properties per batch because of rate limits

## Watch Out
- API rate limit is 100 req/min - must implement throttling
- Error logging schema not yet migrated
```

**Example 2: RalphLoop (bounded, verifiable work)**

```markdown
# Continuing: PRO-300 - Fix Type Errors in Auth Module

**Your task:** Fix 23 remaining type errors in auth module

You are continuing a previous session. First, gather context:

## 1. Read Spec File
```
Read .claude/specs/fix-type-errors-auth.md
```

Check the **Session Log** section for recent progress, decisions, and next steps.

## 2. Check Linear Status
```bash
npx tsx .claude/tools/linear-cc/src/index.ts get-issue PRO-300
```

## 3. Explore Codebase
Use 2 Explore agents to review these files:
- `src/components/auth/LoginForm.tsx` - 8 type errors
- `src/components/auth/RegisterForm.tsx` - 6 type errors
- `src/hooks/useAuth.ts` - 9 type errors (fix first - cascades to components)

## 4. Add Tasks
Use TaskCreate to add these tasks:
- Fix type errors in useAuth.ts (9 errors)
- Fix type errors in LoginForm.tsx (8 errors)
- Fix type errors in RegisterForm.tsx (6 errors)
- Run full typecheck to verify

## Current State
**Status:** In Progress

Started fixing type errors after React 19 upgrade. 23 errors remaining, mostly in auth and form components.

## Decisions (Don't Redo)
- Using strict mode because project requirement
- Fixing errors in order of dependency (hooks first, then components)

## Watch Out
- Some errors cascade - fixing useAuth.ts will resolve related component errors

## Auto-Continue (RalphLoop)

Remaining work is bounded with programmatic verification.
Run in a separate terminal:

\`\`\`bash
cd /Users/dev/project && \
MAX_ITER=10 ITER=0 && \
while [ $ITER -lt $MAX_ITER ] && ! npm run typecheck; do
  claude --print "Fix remaining type errors"
  ITER=$((ITER + 1))
done && echo "✓ Done!" || echo "⚠ Max iterations reached"
\`\`\`

**Stop condition:** `npm run typecheck` returns success
**Safety:** Max 10 iterations
```

**Example 3: Simple single-task continuation**

```markdown
# Continuing: DIS-XXX - Data Pipeline Processing

**Your task:** Run processing pipeline on full dataset

You are continuing a previous session. First, gather context:

## 1. Read Spec File
```
Read .claude/specs/data-pipeline-processing.md
```

Check the **Session Log** section for recent progress, decisions, and next steps.

## 2. Check Linear Status
```bash
npx tsx .claude/tools/linear-cc/src/index.ts get-issue DIS-XXX
```

## 3. Explore Codebase
Use 1 Explore agent to review:
- `src/pipelines/` - transformer and orchestrator modules

## Current State
**Status:** In Progress

Fixed extraction bugs in transformer. Test batch processed successfully. Ready to run on full dataset.

## Decisions (Don't Redo)
- Extract from events (not separate field) because data structure changed
- Use orchestrator CLI for batch processing because handles errors gracefully
```
</examples>

