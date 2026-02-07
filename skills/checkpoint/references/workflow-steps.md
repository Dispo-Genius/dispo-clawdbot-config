# Checkpoint Workflow Steps

Detailed step-by-step procedures for the checkpoint skill. For the overview, see [../SKILL.md](../SKILL.md).

---

## Step 0: Initialize Checklist

**MUST execute first.** Create tasks with TaskCreate to track all checkpoint steps:

```
TaskCreate:
  todos:
    - content: "Detect active spec file"
      status: "pending"
      activeForm: "Detecting active spec file"
    - content: "Detect active ticket"
      status: "pending"
      activeForm: "Detecting active ticket"
    - content: "Check for uncommitted changes"
      status: "pending"
      activeForm: "Checking for uncommitted changes"
    - content: "Gather session context"
      status: "pending"
      activeForm: "Gathering session context"
    - content: "Track decisions made"
      status: "pending"
      activeForm: "Tracking decisions"
    - content: "Update spec file"
      status: "pending"
      activeForm: "Updating spec file"
    - content: "Post checkpoint to Linear"
      status: "pending"
      activeForm: "Posting to Linear"
    - content: "Write handoff to plan file"
      status: "pending"
      activeForm: "Writing handoff"
```

**As you complete each step:**
1. Mark current step `in_progress` before starting
2. Mark step `completed` immediately after finishing
3. Only ONE step should be `in_progress` at a time

---

## Step 1: Detect Active Spec File

**IMPORTANT:** This step MUST run before ticket detection. The spec file is the source of truth.

**Search order (stop at first match):**

1. **Argument:** `/checkpoint DIS-322` → look for `*dis-322*.md` in `.claude/specs/`
2. **Recent file access:** Check if any `.claude/specs/*.md` was read/edited this session
3. **Branch name:** `feature/dis-322-*` → `*dis-322*.md`
4. **Glob search:** `ls .claude/specs/*.md`
   - If only 1 file: use it
   - If multiple files: Ask user via AskUserQuestion which spec to use
5. **None found:**
   - If ticket known from argument → **AUTO-CREATE** minimal spec (see below)
   - If ticket unknown → Ask user which spec or whether to create new

**Auto-create minimal spec (when ticket known but no spec exists):**

```bash
# Get ticket info
npx tsx ~/.claude/tools/linear-cc/src/index.ts get-issue {TICKET}
```

Then create `.claude/specs/{ticket-slug}.md`:
```markdown
# {Ticket Title}

**Linear:** [{TICKET}](https://linear.app/team/issue/{TICKET})

## Overview
{Brief description from ticket}

## Session Log
<!-- Session logs will be appended here -->
```

**Output:** `SPEC_FILE` path (REQUIRED before continuing to Step 1.5)

---

### Step 1.5: Check Spec Size (Restructure Prompt)

After finding the spec, check if it needs restructuring:

```bash
# Count lines and sessions
wc -l {SPEC_FILE}
grep -c "### Session" {SPEC_FILE}
```

**Threshold check:**
```
If spec_lines > 300 OR session_count > 10:
  → Prompt for restructure
```

**If threshold exceeded:**

```
AskUserQuestion:
  "Spec file is getting large ({N} lines, {M} sessions). Restructure into folder format?"
  Options:
    - Yes, restructure now (Recommended)
    - No, keep single file
```

**If "Yes, restructure now":**
1. Run decision extraction: See [../workflows/decision-extraction.md](../workflows/decision-extraction.md)
2. Create folder structure: `.claude/specs/{ticket-slug}/`
3. Create `SPEC.md` from template with extracted decisions
4. Move session logs to `sessions/session-NNN.md` files
5. Update `SPEC_FILE` variable to point to folder path
6. Confirm decisions with user before proceeding

**If "No" or threshold not exceeded:**
- Continue with existing spec file
- Session log will be appended as usual

**TaskUpdate:** Mark "Detect active spec file" as `completed`, mark "Detect active ticket" as `in_progress`.

---

## Step 2: Detect Active Ticket

See [../workflows/ticket-detection.md](../workflows/ticket-detection.md) for full logic.

**If `SPEC_FILE` was found in Step 1:**
1. Extract ticket ID from spec filename (e.g., `improve-checkpoint-dis-400.md` → `DIS-400`)
2. Or extract from spec frontmatter/content (look for `Linear:` or `DIS-XXX` pattern)
3. Verify ticket exists in Linear via `linear-cc`
4. Use as primary ticket

**If `SPEC_FILE` is null (shouldn't happen - Step 1 should create one):**
Fall back to standard detection:

**Priority order:**
1. User-specified argument (e.g., `/checkpoint DIS-322`)
2. Explicit mention in conversation ("working on DIS-322")
3. Branch name pattern (`feature/dis-322-*`)
4. Plan file reference
5. Most recently mentioned `DIS-XXX` in conversation
6. Search Linear by conversation keywords (via `search-issues` command)
7. Fallback: Ask user with AskUserQuestion

**If multiple tickets detected:**
- List all found tickets
- Ask user which one(s) to checkpoint to

**After ticket detection:** If `SPEC_FILE` is still null, create spec file NOW before proceeding.

**TaskUpdate:** Mark "Detect active ticket" as `completed`, mark "Check for uncommitted changes" as `in_progress`.

---

## Step 3: Check for Uncommitted Changes

```bash
git status --porcelain
```

**If changes exist AND `--no-commit` flag NOT specified:**

1. **If `--commit` flag:** Proceed directly to commit validation
2. **Otherwise:** Ask user with AskUserQuestion:
   - "Commit changes before checkpoint?"
   - Options: Yes (commit first) / No (checkpoint only)

**Commit validation (if proceeding with commit):**

```bash
npm run typecheck && npm run build
```

| Result | Action |
|--------|--------|
| Passes | Stage, commit, push (same as `/commit` Step 7) |
| Fails | Warn: "Build failed. Checkpointing without commit." → Continue to Step 2 |

**Commit execution (if validation passes):**

```bash
git add -A
git commit -m "$(cat <<'EOF'
{type}: {summary}

{Ticket identifier}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin HEAD
```

**Skip if:** No uncommitted changes OR `--no-commit` flag specified.

**TaskUpdate:** Mark "Check for uncommitted changes" as `completed`, mark "Gather session context" as `in_progress`.

---

## Step 4: Gather Context

Scan the conversation to build the **Context Summary**:

| Field | How to Extract |
|-------|----------------|
| **Original ask** | First user message or explicit task statement |
| **Approach** | Look for "using", "chose", "going with" + rationale |
| **Remaining** | Todo items not completed, or explicit "still need to" |

Then extract supporting details:

| Pattern | What to Extract |
|---------|-----------------|
| `*.ts`, `*.md`, `*.json` paths | Files touched (include what changed) |
| `DIS-XXX` | Related Linear tickets |
| "?", "unclear", "need to decide" | Open questions |
| "next", "todo", "need to", "should" | Next steps |

### Step 4.1: Detect Task Completion State

**Determine if the task is FULLY DONE vs ongoing work.**

**Completion signals (check for ALL):**
- Todos: all todos marked `completed` AND no "next steps" identified
- Conversation contains explicit completion: "done", "finished", "completed", "all set"
- No remaining work items, blockers, or open questions

**If completion signals detected:**
1. Ask user with AskUserQuestion:
   - "Task appears complete. Clear plan file instead of writing handoff?"
   - Options: Yes (clear plan) / No (write handoff anyway)
2. Store user's choice as `task_state` for Step 6

**If ongoing signals detected:**
- `task_state = ONGOING` (proceed with normal handoff)

**Skip prompting if:** `--clear-plan` flag specified (always clear) or `--handoff` flag specified (always write handoff)

### Step 4.2: Detect Investigation Mode

**Trigger conditions:**
- Blocker mentioned in conversation ("blocked", "stuck", "can't figure out")
- User invoked with `--investigate` flag
- Session involved significant debugging activity

**If investigation mode detected:**

1. Scan recent Grep/Read tool calls to extract file:line references
2. Group into categories:
   - Files that were repeatedly accessed (likely relevant)
   - Files where specific lines were examined
   - Error locations mentioned
3. Present suggestions to user:

```
## Investigation Context Detected

I found these file references from the session:

**Frequently accessed:**
- `src/components/Modal.tsx:45` - read 3 times
- `src/hooks/useAuth.ts:112` - read 2 times

**Error locations:**
- `src/api/client.ts:78` - error stack trace

Include in checkpoint? [Confirm all / Select specific / Skip]
```

4. User confirms which references to include
5. Include confirmed references in Investigation section of checkpoint

**Skip if:** No debugging activity detected and no `--investigate` flag.

**TaskUpdate:** Mark "Gather session context" as `completed`, mark "Track decisions made" as `in_progress`.

### Step 4.3: Capture Task State

**Purpose:** Preserve incomplete tasks for the next session.

1. Call `TaskList` to get current task state
2. Filter for tasks that are NOT `completed`
3. Include in handoff under "## Remaining Tasks" section

**Format for handoff:**
```markdown
## Remaining Tasks

| # | Task | Status |
|---|------|--------|
| 1 | {task subject} | {pending/in_progress} |
| 2 | {task subject} | {pending/in_progress} |
```

**Note:** Tasks persist across sessions via TaskList. No explicit reset needed - the next session can read them directly.

**Skip if:** No tasks exist or all tasks are completed.

### Step 4.4: Detect Spec-In-Progress

**Purpose:** Detect if `/spec` was running when checkpoint was triggered. If so, the handoff MUST instruct the new chat to continue the spec process — not start implementation.

**Detection signals (check ALL):**

| Signal | How to Detect |
|--------|--------------|
| Phase output in conversation | Look for `[Phase N/6]` messages — the highest N is the last completed phase |
| Spec folder exists but no SPEC.md | Folder at `.claude/specs/{date}/{slug}/` exists but `SPEC.md` is missing or empty (Phase 6 not reached) |
| Spec status is `draft` | Spec was created but never reached `pending` or `approved` |
| Exploration artifacts without final spec | `references/exploration.md` exists but no phase files |
| Active spec skill tasks | TaskList shows spec-related tasks (e.g., "Phase 1: Scout", explore agents) |

**If spec-in-progress detected:**

1. **Determine last completed phase:**
   - Scan conversation for highest `[Phase N/6]` completion message
   - Cross-reference with spec folder contents:
     - No folder yet → Phase 0 (interview only)
     - `references/exploration.md` exists → Phase 2+ complete
     - `references/self-review.md` exists → Phase 5.5 complete
     - `SPEC.md` exists and non-empty → Phase 6 complete (not in-progress)

2. **Determine stopping point:**
   - If mid-phase (agents still running): note which agents returned and which didn't
   - If between phases: clean break, note last completed phase

3. **Capture spec artifacts gathered so far:**
   - Phase 0 answers (directional interview responses)
   - Scout results (complexity estimate, file count)
   - Explore agent findings (store in `references/exploration.md` if not already)
   - Plan agent outputs (store in `references/` if not already)
   - Final interview answers (if Phase 5 reached)

4. **Set state:**
   ```
   task_state = SPEC_IN_PROGRESS
   spec_last_phase = N  (0-6)
   spec_slug = {slug}
   spec_path = {path to spec folder}
   ```

5. **Persist artifacts NOW** (before handoff):
   - Any agent outputs not yet saved → write to `references/`
   - Interview answers → write to `references/interview-notes.md`
   - This ensures the next session doesn't lose exploration work

**Skip if:** No `/spec` invocation detected in this session, or spec already has `approved`/`pending` status.

---

## Step 5: Track Decisions

See [../workflows/decision-tracking.md](../workflows/decision-tracking.md) for full logic.

**Before pattern matching, actively recall:**
- What approaches did we consider?
- What did we choose and why?
- Did we change direction at any point? Why?
- What tradeoffs did we make?

**Then process:**
1. Scan for decision patterns: "decided", "chose", "finalized", "will use"
2. Scan for reversal patterns: "actually", "instead", "changed to", "no longer"
3. Mark decisions as `CURRENT` or `SUPERSEDED`
4. Final output: flat list of current decisions with inline rationale

**Example output:**
```markdown
### Decisions
- Using SQLite because simpler for prototype
- Component-based architecture because matches existing patterns

*2 decisions superseded during session (not shown)*
```

---

## Step 6: Check for Spec Changes

Compare current understanding with ticket description:

```bash
# Get current ticket description
npx tsx .claude/tools/linear-cc/src/index.ts get-issue {TICKET}
```

**If spec changed during session:**
1. Detect changes: new acceptance criteria, revised approach, updated requirements
2. Auto-update ticket description:

```bash
npx tsx .claude/tools/linear-cc/src/index.ts update-issue {TICKET} \
  --description "{updated_description}"
```

3. Note in checkpoint comment: "Ticket description updated to reflect revised approach"

**Skip if:** No meaningful spec changes detected

**TaskUpdate:** Mark "Track decisions made" as `completed`, mark "Update spec file" as `in_progress`.

---

## Step 7: Update Spec File and Post to Linear

**Spec files are the source of truth for session context.** Update the spec file, then post a brief comment to Linear for timeline visibility.

### Step 7a: Verify Spec File

**Use the `SPEC_FILE` path from Step 1.** The spec file should already exist at this point.

If `SPEC_FILE` is null (shouldn't happen - Step 1 should have created one):
- Post Linear comment noting "No spec file found"
- Skip to Step 7c

### Step 7b: Append Session Log Entry

**Handle both spec formats:**

**If folder spec** (`SPEC_FILE` is a directory):
1. Create new session file: `{SPEC_FILE}/sessions/session-{NNN}.md`
2. Use template from [../templates/spec-folder/session.md](../templates/spec-folder/session.md)
3. Update `{SPEC_FILE}/SPEC.md`:
   - Update "Quick Context" with summary
   - Add row to Session History table
   - Promote any new decisions to Decisions table

**If single-file spec:**

First, check if Session Log exists:
```bash
grep -q "## Session Log" {SPEC_FILE}
```

**If Session Log section is missing, create it by appending:**

```markdown

---

## Session Log

### Session 1 - {YYYY-MM-DD}
**Status:** {In Progress | Blocked | Near Complete | Done}

**What I Did:**
- {Concrete accomplishments, not vague summaries}

**Decisions Made:**
- {Decision}: {Rationale}

**Files Changed:**
- `path/file.ts` - {what changed}

**Blockers/Issues:**
- {Any problems encountered and how resolved, or "None"}

**Next Session Should:**
1. {First priority - specific and actionable}
2. {Second priority}
```

**If Session Log exists, append new session entry** (increment session number).

**Mandatory fields for each session:**
- **Status** - Current state (In Progress | Blocked | Near Complete | Done)
- **What I Did** - Concrete accomplishments (not "worked on X")
- **Decisions Made** - Include rationale; note if changed from previous: "Changed from X to Y because Z"
- **Files Changed** - Path + what changed
- **Blockers/Issues** - Problems and resolutions (or "None")
- **Next Session Should** - Specific, actionable priorities

**Merging rules:**
- **Session number:** Increment from previous session (or start at 1)
- **Status:** Reflect current state
- **What I Did:** Summarize accomplishments this session
- **Decisions:** Only new decisions this session (existing decisions already in spec)
- **Next:** What the next session should do

**TaskUpdate:** Mark "Update spec file" as `completed`, mark "Post checkpoint to Linear" as `in_progress`.

### Step 7c: Post Brief Linear Comment

Post a brief comment for timeline visibility:
```bash
npx tsx .claude/tools/linear-cc/src/index.ts create-comment {TICKET} \
  "📋 Checkpoint - spec updated with session {N} log"
```

**Error handling:** If Linear fails, warn and continue. Spec file update is the critical path.

### Step 7.5: Create Sub-Issues for Next Steps

**IMPORTANT:** Next steps should be stored as Linear sub-issues, not just in the checkpoint comment or plan file.

For each remaining task identified:
1. Create a sub-issue under the parent ticket
2. Use appropriate type prefix (`[BUG]`, `[FEAT]`, `[IMPROVE]`)
3. Include file paths and implementation hints in description
4. Link to parent ticket in description

```bash
npx tsx .claude/tools/linear-cc/src/index.ts create-issue "[TYPE] Short description" \
  --description "Details...

**Parent:** {TICKET}" \
  --label {appropriate_label}
```

**Why sub-issues over plan file:**
- Sub-issues persist across sessions
- Sub-issues are visible in Linear board
- Sub-issues can be assigned, prioritized, tracked
- Plan file is ephemeral and session-specific

**Skip if:** No meaningful next steps identified

### Step 7.6: Upload Session Transcript (Optional)

> **Note:** With spec-based checkpoints, transcripts are less critical. Session context is captured in the spec file's Session Log. Transcript upload is now optional - use when detailed conversation history is needed for debugging.

**When to upload:**
- Complex debugging sessions where tool calls matter
- Sessions with significant back-and-forth discussion
- User explicitly requests transcript preservation

**When to skip:**
- Standard feature work (Session Log in spec is sufficient)
- Short sessions
- Context is well-captured in spec file

**If uploading:**
```bash
npx tsx .claude/skills/checkpoint/scripts/transcript.ts \
  --session {sessionId} \
  --ticket {TICKET}
```

**Skip by default.** Only upload if specifically needed.

**TaskUpdate:** Mark "Post checkpoint to Linear" as `completed`, mark "Write handoff to plan file" as `in_progress`.

---

## Step 8: Write Handoff to Plan File

**Branch based on `task_state` from Step 4.1 / 4.4:**

---

### IF task_state == SPEC_IN_PROGRESS:

**The spec process was interrupted. The handoff MUST instruct the next chat to continue the spec — NOT start implementation.**

1. Enter plan mode (same as ONGOING flow, Step 8a)
2. Write handoff using the **spec-continuation template** (see [../templates/handoff-prompt.md](../templates/handoff-prompt.md) → `<template name="spec-continuation-handoff">`)
3. Fill in:
   - `{LAST_PHASE}` — last completed phase number (0-6)
   - `{NEXT_PHASE}` — phase to resume from
   - `{SPEC_PATH}` — path to spec folder
   - `{SLUG}` — spec slug
   - `{ARTIFACTS}` — list of saved artifacts in `references/`
   - `{INTERVIEW_ANSWERS}` — summary of user's interview responses (if Phase 0/5 completed)
   - `{SCOUT_RESULTS}` — complexity estimate (if Phase 1 completed)
4. Call ExitPlanMode

**CRITICAL:** The handoff prompt must contain:
- `MUST run /spec --continue` — non-negotiable instruction
- The exact phase to resume from
- All artifacts gathered so far (by path reference, not content)
- User's interview answers (these are lost if not captured)

---

### IF task_state == COMPLETED:

Clear the **session** plan file with a minimal completion message:

```
Write tool:
  file_path: ~/.claude/plans/{session-slug}.md
  content: |
    # Active Plan

    > **Last Updated**: {date}
    > **Linear**: {ticket}

    Task completed. Checkpointed to Linear.
```

**Note:** Use the session-specific plan file path (see Step 8a for how to find it).

**Output to user:**
```
✓ Checkpoint saved to Linear
✓ Task complete - plan file cleared

No handoff needed. Start a fresh session when ready.
```

**Mark "Finalize plan file and exit" as `completed`.**

**SKIP ExitPlanMode** - nothing to hand off. The skill is complete.

---

### IF task_state == ONGOING (default):

Generate handoff content using [../templates/handoff-prompt.md](../templates/handoff-prompt.md), then write directly to the plan file.

**Why:** Claude Code offers "Clear context and start new chat?" after plan mode. Writing to plan file enables one-click continuation instead of copy-paste.

**REQUIRED STEPS:**

#### 8a. Enter Plan Mode FIRST

**CRITICAL:** You must be IN plan mode for ExitPlanMode to show the plan approval UI.

```
EnterPlanMode tool: {}
```

Wait for plan mode to be active before proceeding to write the handoff.

#### 8b. Get session plan file path

**The plan file path is provided in the system prompt.** Look for either:
- `"You should create your plan at {path}"`
- `"Plan File Info:"` section

**Example from system prompt:**
```
Plan File Info:
You should create your plan at ~/.claude/plans/sleepy-finding-cat.md
```

**Extract the exact path** - don't construct it yourself.

**If path not found in system prompt:**
1. List recent plans: `ls -lt ~/.claude/plans/*.md | head -3`
2. Use the most recently modified file
3. If still unclear, ASK the user: "What is your session plan file path?"

**NEVER:**
- Write to `~/.claude/context/` (doesn't exist)
- Write to `~/.claude/projects/*/plan.md` (wrong location)
- Construct arbitrary paths like `~/.claude/handoffs/` or `~/.claude/sessions/`

#### 8c. Write handoff content

**Validate path before writing:**
- Must start with `~/.claude/plans/` or `/Users/*/.claude/plans/`
- Must end with `.md`
- If validation fails, STOP and ask user for correct path

**CRITICAL: CLEAR plan file before writing.**
The Write tool OVERWRITES the entire file - this is intentional. Never append to existing content.
This prevents spec content from accumulating across multiple checkpoints.

Use the **Write tool** to write the handoff prompt (from template) to the **session** plan file.

```
Write tool:
  file_path: ~/.claude/plans/{session-slug}.md  (use exact path from 8b)
  content: {handoff_prompt_from_template}
```

**CRITICAL:** Writing to the wrong plan file means the handoff won't appear when user starts a new session. Always verify you're using the session-specific path (under `~/.claude/plans/`) not the project path.

#### 8c.1. Validate plan file content (post-write)

**After writing, verify plan file contains ONLY handoff content:**

Plan file MUST contain:
- `# Continuing: {TICKET}` header
- `**Your task:**` line
- `**Spec:**` path reference (NOT spec content)
- Context-gathering instructions (steps 1-4)
- `## Current State` section (1-2 sentences)
- `## Decisions (Don't Redo)` (brief list, NOT full table)

Plan file must NOT contain:
- `## Session Log` section
- `### Decisions Made` (full table from Linear comment)
- `### Files Touched` (full list)
- `### Open Questions` (full list)
- `### Investigation` section
- `### Next Steps` (detailed list)
- Full acceptance criteria
- Verbatim spec file content

**If validation fails:** The plan file has spec content bleeding in. Clear and rewrite using ONLY the handoff-prompt template.

#### 8d. Call ExitPlanMode

**For ONGOING tasks, checkpoint MUST end with ExitPlanMode.** This triggers the plan approval UI.

1. Mark "Write handoff to plan file" as `completed`
2. Call ExitPlanMode tool: `{}`

```
ExitPlanMode tool: {} (no parameters needed)
```

This presents the interactive UI where user can:
- Review the handoff content
- Click "Approve" → "Clear context and start new chat?" appears
- Start fresh session with context pre-loaded

**Output to user (before ExitPlanMode):**
```
✓ Checkpoint saved to Linear
✓ Handoff written to plan file

Review the handoff above and click "Approve" to start a new session.
```

**IMPORTANT:** If EnterPlanMode was not approved in step 8a, ExitPlanMode will not show the UI. In that case, inform the user:
```
Handoff written to plan file at {path}.
To continue in a new chat, copy the contents of that file.
```

### Step 8.3: RalphLoop Detection

See [../workflows/ralphloop-detection.md](../workflows/ralphloop-detection.md) for full logic.

**Check if remaining work is Ralph-able** (bounded + programmatically verifiable):

1. Scan remaining work (todo items, "Next Steps" from context)
2. Match against Ralph-able patterns:
   - Type errors → `npm run typecheck`
   - Test failures → `npm run test`
   - Build errors → `npm run build`
   - Lint errors → `npm run lint`

3. If Ralph-able, append to handoff prompt:

```markdown
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
```

**Skip if:** Remaining work requires human judgment, is exploratory, or has no programmatic verification.

---

## Step 9: Plan File (Skip Clear)

> **Changed:** Plan file now contains the handoff prompt (Step 8). Don't clear it - the new session needs this content.

**Default behavior:** Keep plan file as-is (contains handoff for next session)

**Optional `--clear-plan` flag:** If user explicitly wants to clear after checkpoint:
```markdown
# Active Plan

> **Last Updated**: {date}
> **Linear**: {ticket}

No active task. Previous context checkpointed to {ticket}.
```

**Note:** Most users should NOT use `--clear-plan` since it removes the handoff context.

---

## Completion Check

Before finishing, verify:
- [ ] All 8 todo items are `completed`
- [ ] No steps skipped
- [ ] Plan file contains ONLY handoff prompt (no spec content)
- [ ] Session log was written to spec file (not plan file)

**Completion depends on task state:**
- **ONGOING**: ExitPlanMode must be called (user sees plan approval UI)
- **COMPLETED**: ExitPlanMode skipped, user sees completion message directly

**Plan file hygiene check:**
If plan file contains any of these, checkpoint failed - clear and rewrite:
- `## Session Log`
- `### Decisions Made` (full table)
- `### Files Touched` (full list)
- Full spec content copied verbatim
