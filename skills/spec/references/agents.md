# Spec Agents

Agent configurations for the spec storm workflow.

## Agent Overview

| Agent | Model | Type | Purpose |
|-------|-------|------|---------|
| Scout | Opus | Explore | Estimate complexity |
| Explore (3-9) | Opus | Explore | Deep codebase exploration |
| plan-patterns | Opus | Plan | Synthesize patterns |
| plan-architecture | Opus | Plan | Synthesize architecture |
| plan-edge-cases | Opus | Plan | Synthesize edge cases |
| plan-master | Opus | Plan | Unified spec foundation |
| spec-writer | Opus | Write | Write spec files |

All agents use **Opus** for quality.

---

## Scout Agent

**Type:** Explore
**Model:** Opus
**Purpose:** Estimate complexity to determine explore agent count

### Prompt Template

```
Estimate complexity for: {user_intent}

ASSESS:
1. Count files likely to be touched
2. Identify if new patterns needed vs reusing existing
3. Check for cross-cutting concerns

RETURN (concise):
- Estimated file count: N
- Pattern status: existing | new | mixed
- Complexity: small | medium | large
- Key areas: [list main directories/components]
```

### Output Mapping

| Estimated Files | Explore Agents |
|-----------------|----------------|
| <5 | 3 |
| 5-10 | 6 |
| 10+ | 9 |

---

## Explore Agents

**Type:** Explore
**Model:** Opus
**Count:** 3, 6, or 9 based on complexity
**Dimensions:** Patterns, Dependencies, Edge Cases

### Prompt Templates

#### Patterns Dimension

```
Explore PATTERNS for: {intent}

FIND:
- Component patterns used in this area
- Naming conventions (files, functions, variables)
- Code style patterns (hooks vs classes, etc.)
- Import/export patterns

RETURN (concise):
- Pattern: {name} at {file:line}
- Convention: {description}
- Recommendation: {which to follow}

DO NOT return full file contents.
```

#### Dependencies Dimension

```
Explore DEPENDENCIES for: {intent}

FIND:
- Internal module imports
- External package usage
- API endpoints called
- State management patterns
- Data flow through components

RETURN (concise):
- Import: {component} from {path}
- API: {endpoint} via {hook}
- State: {pattern} at {file:line}

DO NOT return full file contents.
```

#### Edge Cases Dimension

```
Explore EDGE CASES for: {intent}

FIND:
- Error handling patterns
- Loading state patterns
- Empty state patterns
- Boundary condition handling
- Validation patterns

RETURN (concise):
- Error: {scenario} → {handling} at {file:line}
- Loading: {pattern} at {file:line}
- Gap: {scenario} → NOT handled

DO NOT return full file contents.
```

---

## Plan Agents

**Type:** Custom (plan-patterns, plan-architecture, plan-edge-cases)
**Model:** Opus
**Execution:** Sequential (each builds on prior)

### plan-patterns

**Input:** Patterns exploration output
**Output:** Component patterns, conventions, code style guidance

See `~/.claude/agents/plan-patterns/AGENT.md`

### plan-architecture

**Input:** Dependencies exploration + plan-patterns output
**Output:** Data flow, module boundaries, integration points

See `~/.claude/agents/plan-architecture/AGENT.md`

### plan-edge-cases

**Input:** Edge cases exploration + prior synthesis
**Output:** Error handling patterns, gaps, recommendations

See `~/.claude/agents/plan-edge-cases/AGENT.md`

---

## Master Plan Agent

**Type:** Custom (plan-master)
**Model:** Opus
**Input:** All three plan agent outputs
**Output:** Unified spec foundation

See `~/.claude/agents/plan-master/AGENT.md`

### Output Format

```markdown
# Spec Foundation

## Summary
{1-2 sentences}

## Key Decisions Required
{Conflicts needing human input}

## Implementation Guidance

### Use These Patterns
| Pattern | Example | Apply To |
|---------|---------|----------|

### Dependencies
| Dependency | Type | Purpose |
|------------|------|---------|

### Module Boundaries
- Touch: {list}
- Avoid: {list}

### Edge Cases to Handle
| Case | Handling | Reference |
|------|----------|-----------|

### Identified Gaps
| Gap | Impact | Recommendation |
|-----|--------|----------------|

## Scope Assessment
- Complexity: {tier}
- Files: ~{N}
- Risk areas: {list}
```

---

## Spec Writer Agent

**Type:** Custom (spec-writer)
**Model:** Opus (updated from haiku)
**Purpose:** Write spec files following manage-spec rules

See `~/.claude/agents/spec-writer/AGENT.md`

### Path Resolution

1. **Flat file:** `.claude/specs/{slug}.md`
2. **Folder spec:** `.claude/specs/{slug}/SPEC.md`
3. **Reference:** `.claude/specs/{slug}/references/*.md`

### Rules

- Read before write (Edit, not Write for existing)
- Never destroy existing content
- Handle both flat and folder structures

---

## Agent Deployment Example

```typescript
// Phase 1: Scout
const scout = await Task({
  description: "Scout complexity",
  prompt: scoutPrompt,
  subagent_type: "Explore",
  model: "opus"
})

// Phase 2: Explore (parallel)
const explores = await Promise.all([
  Task({ prompt: patternsPrompt, subagent_type: "Explore", model: "opus" }),
  Task({ prompt: dependenciesPrompt, subagent_type: "Explore", model: "opus" }),
  Task({ prompt: edgeCasesPrompt, subagent_type: "Explore", model: "opus" })
])

// Phase 3: Plan (sequential)
const patterns = await Task({ prompt: planPatternsPrompt, subagent_type: "plan-patterns", model: "opus" })
const architecture = await Task({ prompt: planArchPrompt, subagent_type: "plan-architecture", model: "opus" })
const edgeCases = await Task({ prompt: planEdgePrompt, subagent_type: "plan-edge-cases", model: "opus" })

// Phase 4: Master
const foundation = await Task({ prompt: masterPrompt, subagent_type: "plan-master", model: "opus" })

// Phase 6: Write
await Task({ prompt: writeSpecPrompt, subagent_type: "spec-writer" })
```
