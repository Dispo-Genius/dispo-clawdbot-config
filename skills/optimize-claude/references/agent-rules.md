# Agent Rules

Standards for Task tool agent configurations.

## YAML Frontmatter

Every AGENT.md **must** have frontmatter:

```yaml
---
name: agent-name
description: Brief description. Triggers on "keyword1", "keyword2".
model: haiku
tools:
  - Read
  - Grep
  - Glob
---
```

| Field | Required | Notes |
|-------|----------|-------|
| name | Yes | Lowercase, hyphenated |
| description | Yes | With trigger keywords |
| model | Yes | haiku/sonnet/opus |
| tools | Yes | List of allowed tools |

## Model Selection

| Model | Use For | Examples |
|-------|---------|----------|
| haiku | Fast, focused tasks | Code search, file counting, simple transforms |
| sonnet | Balanced tasks | Analysis, summaries, moderate complexity |
| opus | Complex reasoning | Architecture decisions, multi-step analysis |

## Tool Declaration

Agents should have minimal tool access:

| Task Type | Typical Tools |
|-----------|---------------|
| Exploration | Read, Grep, Glob |
| Analysis | Read, Grep, Glob, Bash (limited) |
| Documentation | Read, Grep, Glob, Write |
| Code changes | Read, Grep, Glob, Edit, Write |

**Never include without justification:**
- Task (spawning sub-agents)
- Bash with dangerous commands

### Scoped Tools Example: Security Reviewer

```yaml
---
name: security-reviewer
description: Review code for security issues. Triggers on "security review", "check vulnerabilities".
model: sonnet
tools:
  - Read
  - Grep
  - Glob
---
```

**Rationale:** Security reviewers should only read code, never modify it. Restricting tools prevents accidental changes during review.

### Investigation Pattern

Use read-only agents for codebase research:

```yaml
---
name: codebase-investigator
description: Research codebase structure and patterns. Triggers on "investigate", "find where".
model: haiku
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Codebase Investigator

## Output Format
Return structured findings:

### Files Found
- path/to/file.ts:42 - Description of relevance

### Patterns Identified
- Pattern name: Description

### Recommendations
- Specific actionable next steps
```

**Use cases:**
- "Where is authentication handled?"
- "Find all API endpoints"
- "What patterns does this codebase use for X?"

## Output Requirements

| Rule | Check | Fix |
|------|-------|-----|
| Discrete deliverable | Agent produces specific output | Define output format |
| Not guidance-only | Agent doesn't just give advice | Convert to skill if advisory |
| Structured format | Output is parseable | Add output template |

## Agent vs Skill

| Use Agent When | Use Skill When |
|----------------|----------------|
| Background processing | Interactive workflow |
| Specific tool subset | Full tool access needed |
| Isolated subtask | User decision points |
| Parallel execution | Sequential with feedback |

## Trigger Overlap

| Rule | Check | Fix |
|------|-------|-----|
| No skill overlap | Agent triggers different from skill triggers | Merge or differentiate |
| Clear activation | Unambiguous when to use | Update descriptions |

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No model specified | Uses default (may be expensive) | Add model field |
| All tools allowed | Security/cost risk | Restrict to needed tools |
| Guidance-only output | Should be a skill | Convert to skill |
| Overlapping triggers | Confusion on activation | Differentiate keywords |
| No output format | Unpredictable results | Define structure |

## Registration

Agents are registered in settings.local.json under custom_agents or discovered automatically if following naming conventions. Ensure unique trigger patterns.
