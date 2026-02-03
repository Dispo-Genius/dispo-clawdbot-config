# Agent Patterns

How to create Claude Code agents for autonomous task execution.

## What is an Agent?

An agent is an autonomous executor that can:
- Run multi-step tasks independently
- Make decisions based on context
- Complete work without constant user interaction

## Directory Structure

```
~/.claude/agents/[agent-name]/
├── AGENT.md                 # Required: agent definition
├── prompts/                 # Optional: task-specific prompts
│   └── task.md
└── config/                  # Optional: configuration
    └── settings.json
```

## AGENT.md Format

```markdown
---
name: agent-name-kebab-case
description: What this agent does autonomously.
triggers:
  - keyword1
  - keyword2
---

# Agent Name

## Purpose

What this agent accomplishes autonomously.

## Capabilities

- Capability 1
- Capability 2
- Capability 3

## Workflow

1. Step one the agent takes
2. Step two the agent takes
3. Step three the agent takes

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| target | string | Yes | What to operate on |
| options | object | No | Additional configuration |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| result | string | What was accomplished |
| files | string[] | Files modified |

## Example Usage

\`\`\`
Run agent-name on src/components/
\`\`\`

## Constraints

- What the agent will NOT do
- Safety boundaries
- Scope limitations
```

## Agent vs Skill

| Aspect | Agent | Skill |
|--------|-------|-------|
| Execution | Autonomous | Guided |
| User interaction | Minimal | Interactive |
| Scope | Bounded task | Methodology/reference |
| Output | Completed work | Knowledge/guidance |

**Use an Agent when:**
- Task can run to completion autonomously
- Clear success criteria exist
- Minimal user decisions needed during execution

**Use a Skill when:**
- User needs to learn/understand
- Decisions required during process
- Providing reference material

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Agent folder | kebab-case | `code-review`, `test-runner` |
| AGENT.md name field | kebab-case | `code-review` |
| Prompt files | kebab-case.md | `review-pr.md` |

## Best Practices

### 1. Define Clear Boundaries
- Explicit list of what agent will/won't do
- Safety constraints documented
- Scope limitations stated

### 2. Document Inputs/Outputs
- Type each input
- Mark required vs optional
- Describe output format

### 3. Provide Examples
- Show typical invocation
- Include expected output
- Edge cases if relevant

### 4. Design for Autonomy
- Agent should not need clarification
- Handle common edge cases
- Fail gracefully with clear messages

## Integration with Task Tool

Agents can be spawned via the Task tool:

```typescript
// In agent registry
{
  name: 'code-review',
  description: 'Reviews code changes for issues',
  tools: ['Read', 'Grep', 'Glob'],
}
```

Invocation:
```
Use the Task tool with subagent_type=code-review
```
