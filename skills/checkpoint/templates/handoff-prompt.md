# Handoff Prompt Template

Streamlined format for knowledge transfer to new chats. Designed to trigger immediate context-gathering behavior.

---

## CRITICAL: Plan File Hygiene

**The plan file is for the handoff prompt ONLY.** It should:
- Reference the spec path (not copy spec content)
- Contain brief current state (1-2 sentences)
- List key decisions (not full tables)
- Be under ~100 lines

**NEVER include in plan file:**
- `## Session Log` sections
- `### Decisions Made` (full tables from Linear comment)
- `### Files Touched` (full lists)
- Full spec content (acceptance criteria, detailed requirements)
- `gateway.json` configs or code blocks from specs
- Credential setup instructions
- Local skill/tool structure documentation

**Source of truth:** Spec file in `.claude/specs/` - plan file just points to it.

---

<template name="handoff-prompt">
```markdown
# Continuing: {TICKET} - {Brief Title}

**Your task:** {one-line action statement}

**Spec:** `{SPEC_PATH}` ← Read OBJECTIVE.md FIRST

You are continuing a previous session. First, gather context:

## STOP - DO NOT IMPLEMENT YET

**YOU MUST complete steps 1-4 BEFORE writing any code.**

Skipping these steps will result in implementing the WRONG thing.

---

## 1. YOU MUST Read OBJECTIVE.md FIRST

**PROTECTED FILE - do not edit without explicit user permission.**

```bash
Read {SPEC_PATH}/OBJECTIVE.md
```

**STOP and read this file NOW.** It contains:
- **Goal** - What we're building (immutable)
- **IMPORTANT** - User-specified constraints (DO NOT violate)
- **DO NOT** - Anti-patterns to avoid
- **Files** - What we're modifying
- **User Notes** - Verbatim user quotes

**If you skip this step, you WILL implement the wrong thing.**

---

## 2. YOU MUST Read SPEC.md

```bash
Read {SPEC_PATH}/SPEC.md
```

**Check these sections:**
1. **Decisions** - Don't redo these (institutional knowledge)
2. **Current Phase** - Which phase we're on
3. **Session History** - What was already done

---

## 3. Deploy Explore Agent for Codebase Context

**IMPORTANT: Use a subagent - do NOT explore directly in main context.**

```
Task tool with subagent_type="Explore":
"Read the spec at {SPEC_PATH} and explore the files listed in it.
Return a summary of current state and what needs to be done next."
```

This keeps error messages and exploration output OUT of main context.

---

## 4. Load Tasks from Phase File

```bash
Read {SPEC_PATH}/phases/phase-{N}.md
```

**IMPORTANT: Create these exact tasks using TaskCreate BEFORE any other work:**

```
TaskCreate:
  subject: "Phase {N}.1: {task name}"
  description: "{Exact description from phase file}"
  activeForm: "{Present tense action}"

TaskCreate:
  subject: "Phase {N}.2: {task name}"
  description: "{Exact description from phase file}"
  activeForm: "{Present tense action}"

TaskCreate:
  subject: "Phase {N}.3: {task name}"
  description: "{Exact description from phase file}"
  activeForm: "{Present tense action}"
```

Then: `TaskUpdate taskId: "1" status: "in_progress"` before starting first task.

---

## ONLY AFTER completing steps 1-4, proceed with implementation.

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

<template name="spec-continuation-handoff">

## When to Use

Use this template when `task_state == SPEC_IN_PROGRESS` (detected in Step 4.4). The `/spec` process was interrupted before completing all phases. The new chat MUST continue the spec — NOT start implementation.

```markdown
# CONTINUE SPEC: {SLUG}

**Your task:** Continue the `/spec` process from Phase {NEXT_PHASE}

**Spec folder:** `{SPEC_PATH}`

---

## MANDATORY: You MUST continue the spec process

**DO NOT implement anything.** The spec is not finished.

The previous session was running `/spec` and was interrupted at **Phase {LAST_PHASE}/6**.
You MUST pick up where it left off by continuing from **Phase {NEXT_PHASE}**.

---

## 1. Read existing spec artifacts

```bash
# Read whatever exists so far
ls {SPEC_PATH}/
Read {SPEC_PATH}/OBJECTIVE.md        # If exists
Read {SPEC_PATH}/references/          # Exploration findings
```

## 2. Review what was completed

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Directional Interview | {DONE/SKIPPED} | {summary or "N/A"} |
| Phase 1: Scout | {DONE/SKIPPED} | {complexity: small/medium/large, ~N files} |
| Phase 2: Explore Agents | {DONE/PARTIAL/SKIPPED} | {N/M agents returned} |
| Phase 3: Plan Agents | {DONE/PARTIAL/SKIPPED} | {which agents ran} |
| Phase 4: Master Plan | {DONE/SKIPPED} | |
| Phase 5: Final Interview | {DONE/SKIPPED} | |
| Phase 5.5: Self-Review | {DONE/SKIPPED} | |
| Phase 6: Draft Spec | {DONE/SKIPPED} | |

## 3. User's interview answers (DO NOT re-ask these)

{INTERVIEW_ANSWERS — verbatim answers from Phase 0 and/or Phase 5}

## 4. Scout results (DO NOT re-run scout)

{SCOUT_RESULTS — complexity estimate, file count, affected areas}

## 5. Saved artifacts

These files contain work from the previous session — READ them before continuing:

{ARTIFACTS — list of files in references/ with brief descriptions}

## 6. Resume from Phase {NEXT_PHASE}

**Run the /spec skill phases starting from Phase {NEXT_PHASE}.**

Follow the exact spec skill workflow:
- Phase {NEXT_PHASE}: {brief description of what this phase does}
- Then continue through remaining phases in order
- Do NOT skip any remaining phases
- Do NOT re-run completed phases (artifacts are saved above)

{IF NEXT_PHASE == 2 AND partial agents returned:}
**Partial explore results:** {N} of {M} agents returned findings. Deploy only the missing agents:
- {dimension} agents still needed: {count}
{END IF}

{IF NEXT_PHASE == 3:}
**Plan agents are SEQUENTIAL.** Run: plan-patterns → plan-architecture → plan-edge-cases
Feed each agent the exploration findings from `references/exploration.md`.
{END IF}

{IF NEXT_PHASE == 5:}
**Final interview round.** Exploration is complete. Ask 2-3 rounds of questions about:
- UI/UX confirmation
- Edge case handling
- Success criteria
{END IF}

## Decisions (from this session)
- {Any decisions made during interview or exploration}

## Watch Out
- Do NOT re-ask questions the user already answered (see Section 3)
- Do NOT re-run agents that already returned findings (see Section 5)
- The spec folder may have partial content — READ before writing
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

**Example 3: Spec interrupted mid-process (SPEC_IN_PROGRESS)**

```markdown
# CONTINUE SPEC: add-auth-hook

**Your task:** Continue the `/spec` process from Phase 3

**Spec folder:** `.claude/specs/2026-02-04/add-auth-hook/`

---

## MANDATORY: You MUST continue the spec process

**DO NOT implement anything.** The spec is not finished.

The previous session was running `/spec` and was interrupted at **Phase 2/6**.
You MUST pick up where it left off by continuing from **Phase 3**.

---

## 1. Read existing spec artifacts

```bash
ls .claude/specs/2026-02-04/add-auth-hook/
Read .claude/specs/2026-02-04/add-auth-hook/OBJECTIVE.md
Read .claude/specs/2026-02-04/add-auth-hook/references/exploration.md
```

## 2. Review what was completed

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Directional Interview | DONE | Auth hook for session persistence |
| Phase 1: Scout | DONE | Complexity: small, ~4 files |
| Phase 2: Explore Agents | DONE | 3/3 agents returned |
| Phase 3: Plan Agents | SKIPPED | Not started |
| Phase 4: Master Plan | SKIPPED | |
| Phase 5: Final Interview | SKIPPED | |
| Phase 5.5: Self-Review | SKIPPED | |
| Phase 6: Draft Spec | SKIPPED | |

## 3. User's interview answers (DO NOT re-ask these)

- **App area:** Authentication hooks in `src/hooks/`
- **Core problem:** Need session persistence across page refreshes
- **Existing patterns:** `useUser` hook in `src/hooks/useUser.ts`

## 4. Scout results (DO NOT re-run scout)

- Complexity: small (~4 files)
- Deploy 3 explore agents (1 per dimension)
- Key files: `useUser.ts`, `LoginForm.tsx`, `api/auth.ts`, `middleware.ts`

## 5. Saved artifacts

- `references/exploration.md` — All 3 explore agent findings (patterns, deps, edge cases)
- `references/interview-notes.md` — Phase 0 interview answers

## 6. Resume from Phase 3

**Run the /spec skill phases starting from Phase 3.**

**Plan agents are SEQUENTIAL.** Run: plan-patterns → plan-architecture → plan-edge-cases
Feed each agent the exploration findings from `references/exploration.md`.

Then continue through Phase 4, 5, 5.5, and 6.

## Decisions (from this session)
- Token stored in localStorage (not cookie) per user preference
- Hook follows existing useUser pattern

## Watch Out
- Do NOT re-ask questions the user already answered (see Section 3)
- Do NOT re-run explore agents (see Section 5)
```

**Example 4: With explicit TaskCreate (dense format)**

```markdown
# Continuing: DIS-400 - Add Auth Hook

**Your task:** Implement Phase 2 (session persistence)

**Spec:** `.claude/specs/2026-02-04/add-auth-hook/` ← Read OBJECTIVE.md FIRST

---

## STOP - DO NOT IMPLEMENT YET

**YOU MUST complete steps 1-4 BEFORE writing any code.**

---

## 1. Read OBJECTIVE.md FIRST (PROTECTED)
```bash
Read .claude/specs/2026-02-04/add-auth-hook/OBJECTIVE.md
```

## 2. Read SPEC.md
```bash
Read .claude/specs/2026-02-04/add-auth-hook/SPEC.md
```

## 3. Deploy Explore Agent
```
Task tool with subagent_type="Explore":
"Read spec at .claude/specs/2026-02-04/add-auth-hook/ and explore listed files."
```

## 4. Load Tasks (EXACT TaskCreate calls)

```
TaskCreate:
  subject: "Phase 2.1: Add useEffect for token check"
  description: "In src/hooks/useAuth.ts, add useEffect that runs on mount.
  Check localStorage for 'auth_token'. If found, call /api/auth/verify.
  Set isAuthenticated based on response."
  activeForm: "Adding token check useEffect"

TaskCreate:
  subject: "Phase 2.2: Handle verification failure"
  description: "If /api/auth/verify returns 401, clear localStorage token
  and set isAuthenticated=false. Log user out gracefully."
  activeForm: "Handling verification failure"

TaskCreate:
  subject: "Phase 2.3: Run typecheck and build"
  description: "npm run typecheck && npm run build. Fix any errors."
  activeForm: "Running verification"
```

Then: `TaskUpdate taskId: "1" status: "in_progress"`

---

## Current State
**Status:** In Progress

Phase 1 complete (basic hook structure). Starting Phase 2 (persistence).

## Decisions (Don't Redo)
- Token in localStorage (not cookie) because SPA pattern
- Verify on mount (not on every render) for performance
```
</examples>

