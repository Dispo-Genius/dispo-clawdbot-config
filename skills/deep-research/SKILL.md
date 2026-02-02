---
name: deep-research
description: Multi-agent deep research with truth-seeking verification. Spawns parallel research agents, runs 3-layer verification pipeline, synthesizes comprehensive reports with citations and confidence levels. Triggers on "deep research", "research thoroughly", "investigate deeply", "comprehensive analysis", "find everything about".
---

# Deep Research Skill

Multi-agent orchestration for comprehensive research with truth-seeking verification.

## Invocation

```bash
/deep-research "query"                    # Full workflow
/deep-research "query" --quick            # Fewer agents, shorter timeouts
/deep-research "query" --focus web        # Web-only research
/deep-research "query" --focus codebase   # Codebase-only research
```

## Overview

This skill orchestrates parallel sub-agents to conduct thorough research, then verifies findings through a 3-layer pipeline before synthesizing a comprehensive report.

**Key differentiators:**
- Every sub-agent uses `/reasoning --quick` before concluding
- Multi-layer verification pipeline (not just cross-validation)
- Explicit termination criteria at each phase
- Hallucination detection at generation time
- Graceful error recovery with partial results

---

## Architecture

```
Phase 0: Query Analysis (1 lead agent)
    ↓
Phase 1: Initial Research (3-9 parallel agents)
    ↓
Phase 2: Verification Pipeline (3 specialized agents)
    ↓
Phase 3: Gap Analysis + Termination Check
    ↓
Phase 4: Deep Dive (2-6 parallel agents) [if gaps critical]
    ↓
Phase 5: Synthesis + Pre-Mortem
    ↓
Phase 6: Report Generation
```

### Agent Types

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| `research-lead` | Query decomposition, orchestration | Read, Glob |
| `research-web` | Web search with source assessment | WebSearch, WebFetch |
| `research-codebase` | Code exploration | Read, Grep, Glob |
| `research-fact-checker` | Claim verification against sources | WebSearch, WebFetch |
| `research-consistency` | Cross-agent consistency check | Read |
| `research-credibility` | Source credibility assessment | WebSearch, WebFetch |
| `research-gaps` | Gap analysis + termination decision | Read |
| `research-deep` | Focused investigation | All |
| `research-synthesis` | Unify with pre-mortem | Read |
| `research-report` | Generate output with audit trail | Read, Write |

---

## Phase Details

### Phase 0: Query Analysis

**Agent:** `research-lead`

Lead agent decomposes the query:

1. **Reframe as research question** - Focus on outcome, not search terms
2. **Identify dimensions** - 2-5 distinct research angles
3. **Estimate complexity** - Determines agent count (3-9)
4. **Define success criteria** - What would constitute a complete answer?

**Output:** Research plan with dimensions, agent allocation, termination criteria

```markdown
## Research Plan

**Query:** {original query}
**Reframed:** {research question}

### Dimensions
1. {dimension} - {what to investigate}
2. {dimension} - {what to investigate}

### Agent Allocation
- Web agents: {N}
- Codebase agents: {N}

### Success Criteria
- {criterion 1}
- {criterion 2}

### Termination Triggers
- {when to stop early}
```

---

### Phase 1: Initial Research (Parallel)

**Agents:** 3-9 `research-web` and/or `research-codebase` based on complexity

Each research agent:
- Conducts 5-10 targeted searches
- Assesses source credibility for each result
- Applies `/reasoning --quick` before concluding
- Documents all claims with citations

**Agent Prompt Requirements:**

Every research agent prompt includes:

```
REASONING REQUIREMENT:
Before concluding, apply /reasoning --quick:
1. What am I actually trying to find?
2. Is this claim falsifiable?
3. What can I delete from findings?
4. What's the simplest explanation?

CITATION REQUIREMENT:
Every claim must include [Source: URL/file:line]
No source = mark as "unverified assertion"
```

**Phase 1 Time Budget:** 3 minutes total

---

### Phase 2: Verification Pipeline (Parallel)

Three specialized verification agents run in parallel:

#### 2a. Fact-Checker Agent (`research-fact-checker`)

Verifies claims against retrieved sources:
- Compare each generated claim to source text
- Flag unsupported or weakly-supported claims
- Use LLM-as-judge pattern for semantic matching

**Output:**
```markdown
## Fact-Check Results

### Verified Claims
| Claim | Source Evidence | Match Quality |
|-------|-----------------|---------------|
| {claim} | "{quote}" [Source] | Strong/Moderate |

### Unsupported Claims
| Claim | Issue |
|-------|-------|
| {claim} | Source doesn't support this |
```

#### 2b. Consistency Agent (`research-consistency`)

Checks cross-agent agreement:
- SAC3-style semantic consistency checking
- Flag contradictions between research agents
- Identify claims with single-source only

**Output:**
```markdown
## Consistency Analysis

### Multi-Source Agreement
| Claim | Supporting Agents | Confidence |
|-------|-------------------|------------|
| {claim} | Agent 1, Agent 3 | High |

### Contradictions
| Topic | Agent A Says | Agent B Says | Resolution |
|-------|-------------|--------------|------------|
| {topic} | {claim A} | {claim B} | {recommended} |

### Single-Source Only
- {claim} [Only from Agent 2]
```

#### 2c. Credibility Agent (`research-credibility`)

Assesses source quality:
- Tier sources by type
- Apply temporal decay
- Flag low-credibility sources

**Source Credibility Tiers:**
1. **Official** - Official documentation, company announcements
2. **Academic** - Peer-reviewed papers, research institutions
3. **Expert** - Recognized experts, authoritative blogs
4. **Community** - Stack Overflow, forum discussions, tutorials
5. **Anonymous** - Unattributed content, unknown authors

**Output:**
```markdown
## Source Credibility Assessment

| Source | Type | Tier | Temporal | Overall |
|--------|------|------|----------|---------|
| {url} | Official Docs | 1 | Current | High |
| {url} | Blog Post | 3 | 2 years old | Medium |
```

**Phase 2 Time Budget:** 2 minutes total

---

### Phase 3: Gap Analysis + Termination

**Agent:** `research-gaps`

Sequential analysis that:
1. Lists unanswered aspects of original query
2. Rates each gap: **Critical** vs **Nice-to-have**
3. Makes explicit termination decision

**Termination Gate:**

| Condition | Action |
|-----------|--------|
| All critical questions answered with high confidence | → Skip Phase 4, proceed to synthesis |
| Remaining gaps are nice-to-have only | → Skip Phase 4, proceed to synthesis |
| Critical gaps identified | → Proceed to Phase 4 deep dives |

**Output:**
```markdown
## Gap Analysis

### Gaps Identified
| Gap | Severity | Reason |
|-----|----------|--------|
| {gap} | Critical | Core to answering query |
| {gap} | Nice-to-have | Would enrich answer |

### Termination Decision
**Decision:** {PROCEED TO SYNTHESIS / DEEP DIVE REQUIRED}
**Rationale:** {why}

### Deep Dive Targets (if proceeding)
1. {specific investigation target}
2. {specific investigation target}
```

---

### Phase 4: Deep Dive (Conditional, Parallel)

**Agents:** 2-6 `research-deep` agents

Only runs if Phase 3 identifies critical gaps.

Each agent:
- Focuses on one specific gap
- Conducts 10+ targeted searches
- Seeks primary sources, expert opinions
- Same verification requirements as Phase 1

**Phase 4 Time Budget:** 3 minutes total

**Additional Termination Check:**
After Phase 4 completes, assess:
- If deep dive yielded <10% new information → proceed to synthesis
- If 3+ iterations with diminishing returns → stop, document limitations

---

### Phase 5: Synthesis + Pre-Mortem

**Agent:** `research-synthesis`

Single agent that:
1. **Unifies** all verified findings across agents
2. **Resolves** remaining contradictions (or flags as unresolved)
3. **Pre-mortem:** "If these conclusions are wrong, likely because..."
4. **Applies full `/reasoning`** (not just quick version)

**Grounding Requirement:**
- All synthesis must trace to research agent outputs
- No new claims allowed in synthesis phase
- Every statement must cite which agent(s) produced it

**Output:**
```markdown
## Synthesis

### Unified Findings
{organized by dimension, with inline citations to agents}

### Resolved Contradictions
| Topic | Resolution | Rationale |
|-------|------------|-----------|
| {topic} | {chosen interpretation} | {why} |

### Unresolved Contradictions
| Topic | Interpretations | Impact |
|-------|-----------------|--------|
| {topic} | A vs B | {how this affects conclusions} |

### Pre-Mortem
If these conclusions are wrong, likely because:
1. {failure mode 1}
2. {failure mode 2}
3. {failure mode 3}
```

---

### Phase 6: Report Generation

**Agent:** `research-report`

Generates final report with complete audit trail.

**Report Location:** `.claude/research/{slug}.md`

**Report Structure:**

```markdown
# Research Report: {title}

**Query:** {original}
**Date:** {ISO date}
**Confidence:** {overall %}

## Executive Summary
{3-5 sentences answering the query}

## Key Findings
| # | Finding | Confidence | Sources |
|---|---------|------------|---------|
| 1 | {claim} | {%} | [1], [2] |

## Detailed Analysis
{organized by dimension, with inline citations}

## Verification Summary
- Claims verified (multi-source): {N}
- Claims single-source: {N}
- Contradictions resolved: {N}
- Contradictions unresolved: {N}

## Pre-Mortem
If these conclusions are wrong, likely because:
1. {failure mode}
2. {failure mode}

## Limitations
- {what we couldn't verify}
- {what we didn't research}

## Methodology
- Research agents: {N}
- Verification agents: 3
- Web searches: ~{N}
- Sources consulted: {N}

## Sources
| # | Source | Type | Credibility |
|---|--------|------|-------------|
| 1 | {url} | {official/academic/blog} | {high/medium/low} |
```

---

## Robustness Mechanisms

### 1. Explicit Termination Criteria

Research shows agents often fail to recognize when to stop. Each phase includes explicit termination gates.

See: `references/termination-criteria.md`

### 2. Multi-Layer Verification Pipeline

Three specialized verification agents (not just cross-validation):
1. **Fact-Checker** - Claims vs source text
2. **Consistency** - Cross-agent agreement
3. **Credibility** - Source quality ratings

See: `references/verification-pipeline.md`

### 3. Error Handling & Recovery

| Error Type | Strategy |
|------------|----------|
| Agent timeout | Proceed with partial results, flag gaps |
| API rate limit | Exponential backoff (1s → 2s → 4s) + jitter |
| WebSearch failure | Retry 2x, then mark dimension as incomplete |
| Agent produces no results | Log, continue with other agents |
| Contradictory findings | Escalate to credibility assessment |

**Isolation Principle:** One agent failure never cascades to others.
**Partial Completion:** Always produce output, even if incomplete.

See: `references/error-recovery.md`

### 4. Anti-Hallucination Mechanisms

1. **Citation Requirement** - Every claim must include source
2. **Self-Consistency Check** - Verify claims appear in cited sources
3. **Confidence Calibration** - Explicit % confidence required
4. **Grounding Requirement** - Synthesis traces to research outputs

### 5. Rabbit Hole Prevention

| Guardrail | Limit |
|-----------|-------|
| Searches per research agent | Max 10 |
| Link-follows per search | Max 3 |
| Phase 1 total time | 3 min |
| Phase 2 total time | 2 min |
| Phase 4 total time | 3 min |
| Individual agent timeout | 5 min |

**Diminishing Returns Detection:**
- Track new information per search
- Stop when <10% novel findings

---

## Implementation

### Spawning Parallel Agents

Use the Task tool to spawn research agents in parallel. Send a single message with multiple Task tool calls:

```typescript
// Phase 1: Spawn 3+ research agents in parallel
Task({
  subagent_type: "general-purpose",
  description: "Research: {dimension 1}",
  prompt: RESEARCH_WEB_PROMPT + dimension1Instructions
})
Task({
  subagent_type: "general-purpose",
  description: "Research: {dimension 2}",
  prompt: RESEARCH_WEB_PROMPT + dimension2Instructions
})
// ... etc
```

### Agent Prompt Templates

Full prompt templates for all agent types in: `references/agent-prompts.md`

### Workflow Execution

The orchestrating agent (main Claude session) follows this pattern:

1. **Phase 0:** Analyze query, create research plan
2. **Phase 1:** Spawn parallel Task agents, collect results
3. **Phase 2:** Spawn 3 verification agents in parallel
4. **Phase 3:** Analyze gaps, decide termination
5. **Phase 4:** (If needed) Spawn deep dive agents
6. **Phase 5:** Single synthesis agent
7. **Phase 6:** Generate and save report

### Quick Mode (`--quick`)

When `--quick` flag is used:
- Phase 1: 3 agents max (vs 3-9)
- Phase 2: Skip credibility agent
- Phase 4: Skip entirely
- Time budgets halved

### Focus Modes

**`--focus web`:**
- Only spawn `research-web` agents
- Skip codebase exploration

**`--focus codebase`:**
- Only spawn `research-codebase` agents
- Use Explore agent for comprehensive code search
- Skip web searches

---

## References

- `references/agent-prompts.md` - Full prompt templates for all agents
- `references/verification-pipeline.md` - 3-agent verification details
- `references/error-recovery.md` - Failure handling patterns
- `references/termination-criteria.md` - When to stop researching
- `references/source-credibility.md` - How to assess sources
- `references/reasoning-integration.md` - How agents use /reasoning
- `assets/report-example.md` - Example good output
