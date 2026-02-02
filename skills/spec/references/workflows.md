# Spec Workflows

7-phase agent storm workflow for comprehensive spec creation.

## ENFORCEMENT

This section contains MANDATORY tool calls. Copy these exactly.

### Scout Tool Call (Phase 1) - REQUIRED

You MUST send this exact tool call:

```typescript
Task({
  description: "Scout complexity",
  prompt: `Estimate complexity for: {user_intent}

ASSESS:
1. Count files likely to be touched
2. Identify if new patterns needed vs reusing existing
3. Check for cross-cutting concerns

RETURN (concise):
- Estimated file count: N
- Pattern status: existing | new | mixed
- Complexity: small | medium | large
- Key areas: [list main directories/components]`,
  subagent_type: "Explore",
  model: "opus"
})
```

### Explore Agents Tool Call (Phase 2) - REQUIRED

For **small** complexity (3 agents), you MUST send a SINGLE message with these 3 tool calls:

```typescript
Task({ description: "Explore patterns", prompt: "Explore PATTERNS for: {intent}. Find component patterns, naming conventions, code style. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore dependencies", prompt: "Explore DEPENDENCIES for: {intent}. Find imports, API calls, state management, module relationships. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore edge cases", prompt: "Explore EDGE CASES for: {intent}. Find error handling, loading states, empty states, boundary conditions. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
```

For **medium** complexity (6 agents), you MUST send a SINGLE message with these 6 tool calls:

```typescript
Task({ description: "Explore patterns primary", prompt: "Explore PATTERNS in primary area for: {intent}. Find component patterns, naming conventions. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore patterns related", prompt: "Explore PATTERNS in related areas for: {intent}. Find similar patterns elsewhere in codebase. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore deps internal", prompt: "Explore DEPENDENCIES - internal modules for: {intent}. Find imports, module boundaries. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore deps external", prompt: "Explore DEPENDENCIES - external APIs for: {intent}. Find API calls, third-party integrations. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore edge errors", prompt: "Explore EDGE CASES - error paths for: {intent}. Find error handling patterns. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore edge boundaries", prompt: "Explore EDGE CASES - boundary conditions for: {intent}. Find loading states, empty states, limits. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
```

For **large** complexity (9 agents), you MUST send a SINGLE message with these 9 tool calls:

```typescript
Task({ description: "Explore patterns components", prompt: "Explore PATTERNS - component patterns for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore patterns naming", prompt: "Explore PATTERNS - naming conventions for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore patterns styling", prompt: "Explore PATTERNS - styling patterns for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore deps imports", prompt: "Explore DEPENDENCIES - imports for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore deps apis", prompt: "Explore DEPENDENCIES - APIs for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore deps state", prompt: "Explore DEPENDENCIES - state management for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore edge errors", prompt: "Explore EDGE CASES - errors for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore edge loading", prompt: "Explore EDGE CASES - loading states for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
Task({ description: "Explore edge boundaries", prompt: "Explore EDGE CASES - boundaries for: {intent}. Return file:line references.", subagent_type: "Explore", model: "sonnet" })
```

### Plan Agents Tool Calls (Phase 3) - REQUIRED, SEQUENTIAL

MUST BE SEQUENTIAL. Run in exact order with WAIT between each.

**Step 1:** Run plan-patterns first:

```typescript
Task({
  description: "Synthesize patterns",
  prompt: `Synthesize pattern findings from exploration:

EXPLORATION RESULTS:
{patterns_exploration_output}

Produce: Component patterns, naming conventions, code style guidance.`,
  subagent_type: "plan-patterns",
  model: "sonnet"
})
```

**WAIT for result.** Then Step 2:

```typescript
Task({
  description: "Synthesize architecture",
  prompt: `Synthesize architecture findings:

EXPLORATION RESULTS:
{dependencies_exploration_output}

PRIOR SYNTHESIS (from plan-patterns):
{plan_patterns_output}

Produce: Data flow, module boundaries, integration points.`,
  subagent_type: "plan-architecture",
  model: "sonnet"
})
```

**WAIT for result.** Then Step 3:

```typescript
Task({
  description: "Synthesize edge cases",
  prompt: `Synthesize edge case findings:

EXPLORATION RESULTS:
{edge_cases_exploration_output}

PRIOR SYNTHESIS (from plan-patterns):
{plan_patterns_output}

PRIOR SYNTHESIS (from plan-architecture):
{plan_architecture_output}

Produce: Error handling patterns, gaps, recommendations.`,
  subagent_type: "plan-edge-cases",
  model: "sonnet"
})
```

### Master Plan Tool Call (Phase 4) - REQUIRED

```typescript
Task({
  description: "Create spec foundation",
  prompt: `Create unified spec foundation:

SYNTHESIS FROM plan-patterns:
{plan_patterns_output}

SYNTHESIS FROM plan-architecture:
{plan_architecture_output}

SYNTHESIS FROM plan-edge-cases:
{plan_edge_cases_output}

Produce: Unified foundation with conflicts flagged.`,
  subagent_type: "plan-master",
  model: "opus"
})
```

---

## Overview

```
Phase 0: Directional Interview (2-3 questions)
    ↓
Phase 1: Scout Agent (Opus) → estimates complexity
    ↓
Phase 2: Explore Agents (Sonnet, 3-9)
    ↓
Phase 3: Plan Agents (Sonnet, sequential)
    ↓
Phase 4: Master Plan Agent (Opus)
    ↓
Phase 5: Final Interview (2-3 rounds)
    ↓
Phase 6: Draft Spec
```

---

## Phase 0: Directional Interview

**Purpose:** Get enough context to guide exploration.

**If `/spec PRO-XXX`:** Fetch existing ticket first.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec linear get-issue {TICKET}
```

**If `/spec --refine {slug}`:** Load existing spec from `.claude/specs/{slug}.md` or `.claude/specs/{slug}/SPEC.md`.

**Otherwise:** Ask 2-3 directional questions via AskUserQuestion:

1. What area of the app does this involve?
2. What's the core problem or improvement?
3. Any existing patterns or components to reference?

**Output:** User intent summary for scout agent.

---

## Phase 1: Scout Agent

**Purpose:** Estimate complexity to determine agent count.

Deploy a single Explore agent to assess scope:

```typescript
Task({
  description: "Scout complexity",
  prompt: `Estimate complexity for: {user_intent}

ASSESS:
1. Count files likely to be touched
2. Identify if new patterns needed vs reusing existing
3. Check for cross-cutting concerns

RETURN (concise):
- Estimated file count: N
- Pattern status: existing | new | mixed
- Complexity: small | medium | large
- Key areas: [list main directories/components]`,
  subagent_type: "Explore",
  model: "opus"
})
```

**Complexity Mapping:**

| Estimated Files | Complexity | Explore Agents |
|-----------------|------------|----------------|
| <5 | small | 3 (1 per dimension) |
| 5-10 | medium | 6 (2 per dimension) |
| 10+ | large | 9 (3 per dimension) |

**User Feedback:**
```
Scout found ~{N} files. Deploying {count} explore agents...
```

---

## Phase 2: Explore Agents

**Purpose:** Deep parallel exploration across 3 dimensions.

### Dimensions

| Dimension | What to Find |
|-----------|--------------|
| **Patterns** | Component patterns, naming conventions, code style |
| **Dependencies** | Imports, API calls, state management, module relationships |
| **Edge Cases** | Error handling, loading states, empty states, boundary conditions |

### Agent Deployment

For **small** (3 agents):
```typescript
// 1 agent per dimension
Task({ prompt: `Explore PATTERNS for: {intent}...`, subagent_type: "Explore", model: "sonnet" })
Task({ prompt: `Explore DEPENDENCIES for: {intent}...`, subagent_type: "Explore", model: "sonnet" })
Task({ prompt: `Explore EDGE CASES for: {intent}...`, subagent_type: "Explore", model: "sonnet" })
```

For **medium** (6 agents):
```typescript
// 2 agents per dimension - split by area
Task({ prompt: `Explore PATTERNS in primary area...`, model: "sonnet" })
Task({ prompt: `Explore PATTERNS in related areas...`, model: "sonnet" })
Task({ prompt: `Explore DEPENDENCIES - internal modules...`, model: "sonnet" })
Task({ prompt: `Explore DEPENDENCIES - external APIs...`, model: "sonnet" })
Task({ prompt: `Explore EDGE CASES - error paths...`, model: "sonnet" })
Task({ prompt: `Explore EDGE CASES - boundary conditions...`, model: "sonnet" })
```

For **large** (9 agents):
```typescript
// 3 agents per dimension - comprehensive coverage
// Patterns: components, naming, styling
// Dependencies: imports, APIs, state
// Edge Cases: errors, loading, boundaries
```

### Return Format

Each agent returns concise findings:

```markdown
## Exploration: {Dimension}

### Findings
- Pattern: {name} at {file:line}
- Import: {component} from {path}
- Edge: {scenario} → {handling}

### Recommendations
- Use: {pattern/component}
- Avoid: {anti-pattern}
```

**DO NOT return full file contents.** Summaries only.

---

## Phase 3: Plan Agents (Sequential)

**Purpose:** Synthesize exploration into actionable guidance.

Run 3 plan agents **sequentially** - each builds on prior output:

### Step 1: plan-patterns

```typescript
Task({
  description: "Synthesize patterns",
  prompt: `Synthesize pattern findings:

EXPLORATION RESULTS:
{patterns_exploration_output}

Produce: Component patterns, naming conventions, code style guidance.`,
  subagent_type: "plan-patterns",
  model: "sonnet"
})
```

### Step 2: plan-architecture

```typescript
Task({
  description: "Synthesize architecture",
  prompt: `Synthesize architecture findings:

EXPLORATION RESULTS:
{dependencies_exploration_output}

PRIOR SYNTHESIS:
{plan_patterns_output}

Produce: Data flow, module boundaries, integration points.`,
  subagent_type: "plan-architecture",
  model: "sonnet"
})
```

### Step 3: plan-edge-cases

```typescript
Task({
  description: "Synthesize edge cases",
  prompt: `Synthesize edge case findings:

EXPLORATION RESULTS:
{edge_cases_exploration_output}

PRIOR SYNTHESIS:
{plan_patterns_output}
{plan_architecture_output}

Produce: Error handling patterns, gaps, recommendations.`,
  subagent_type: "plan-edge-cases",
  model: "sonnet"
})
```

---

## Phase 4: Master Plan Agent

**Purpose:** Unify all synthesis into spec foundation.

```typescript
Task({
  description: "Create spec foundation",
  prompt: `Create unified spec foundation:

SYNTHESIS:
{plan_patterns_output}
{plan_architecture_output}
{plan_edge_cases_output}

Produce: Unified foundation with conflicts flagged.`,
  subagent_type: "plan-master",
  model: "opus"
})
```

**Output:** Spec Foundation document for final interview.

---

## Phase 5: Final Interview

**Purpose:** Confirm decisions and fill gaps.

### Round 1: UI/UX Confirmation

Present findings and ask:
- Does this UI approach match your expectation?
- Any interaction patterns to add?
- Loading/error states acceptable?

### Round 2: Edge Cases Confirmation

Present gaps found and ask:
- How should we handle {gap}?
- Any additional edge cases?
- Priority of edge case handling?

### Round 3: Success Criteria

Ask:
- What does "done" look like?
- What should NOT happen?
- Any specific tests needed?

**Scope Changes:**
If exploration revealed larger scope than expected, surface it:
```
Exploration revealed {N} files instead of expected {M}.
- Additional areas: {list}
- Recommend: {continue | split | descope}
```

---

## Phase 6: Draft Spec

### Write Spec

Generate spec at `.claude/specs/{slug}/SPEC.md` (folder structure for storm specs).

Use spec-writer agent:

```typescript
Task({
  description: "Write spec",
  prompt: `Write spec to .claude/specs/{slug}/SPEC.md:

FOUNDATION:
{master_plan_output}

INTERVIEW:
{final_interview_answers}

Follow spec-format.md template. Include references section.`,
  subagent_type: "spec-writer"
})
```

### Write Exploration References

Store exploration artifacts:

```typescript
Task({
  description: "Write exploration reference",
  prompt: `Write exploration reference to .claude/specs/{slug}/references/exploration.md:

{exploration_outputs}

Follow exploration reference format.`,
  subagent_type: "spec-writer"
})
```

### Folder Structure

```
.claude/specs/{slug}/
├── SPEC.md              # Main spec
└── references/
    ├── exploration.md   # Exploration findings
    └── synthesis.md     # Plan agent synthesis
```

---

## Spec Update Rules

**ALWAYS follow these rules when modifying an existing spec:**

### Before Any Modification
1. **Read the existing spec first** - Use Read tool to load current content
2. **Identify what sections exist** - Note which sections have content

### How to Update
- **Use Edit tool** for targeted changes, NOT Write tool for full rewrites
- **Append, don't replace** - New findings go AFTER existing content
- **Preserve all existing research** - Investigation, code references, prior exploration

### Section-Specific Rules

| Section | Update Behavior |
|---------|-----------------|
| Problem | Replace only if user explicitly redefines |
| Goal | Replace only if user explicitly redefines |
| Solution | Append new approaches, preserve prior attempts |
| Files to Modify | Add new files, keep existing |
| Edge Cases | Add new rows, never delete existing |
| Investigation | ALWAYS append, never delete |
| References | Add new references, preserve existing |

---

## Review & Approve

### Slack DM Review Flow

1. **Detect current user:**
```bash
whoami
```

2. **Lookup Slack handle:**
```bash
cat ~/.claude/config/users.json
```

3. **Send spec to Slack DM:**
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm {handle} ":clipboard: Spec ready: *{title}*"
```

4. **Wait for user response:**
- "approve" - Push to Linear
- "edit" - Wait for edits
- "cancel" - Discard

### On Approval

1. Create Linear issue
2. Update spec status to `approved`
3. Trigger `/checkpoint`

---

## Handle Blocked (--refine)

When refining a blocked spec:

1. **Load existing spec** (folder or flat)
2. **Read blocker section**
3. **Run abbreviated storm** (fewer agents, focused on blocker)
4. **Update spec** (append, don't replace)
5. **Re-approve**

---

## Investigation Workflow

For `--refine` on blocked specs:

### File Detection

Scan session for file references:
- From Read/Grep tool calls
- From error stack traces
- Categorize: frequently accessed, error locations, code paths

### Investigation Section

```markdown
## Investigation

### Code Flow
**Working Path:** ...
**Broken Path:** ...

### What We Tried
- {Approach} - {outcome}
```
