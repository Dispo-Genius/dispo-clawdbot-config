---
name: agent-name-here
description: What this agent does autonomously.
triggers:
  - keyword1
  - keyword2
---

# Agent Name

## Purpose

What this agent accomplishes when run autonomously.

## Capabilities

- Capability 1
- Capability 2
- Capability 3

## Workflow

1. First step the agent takes
2. Second step the agent takes
3. Third step the agent takes
4. Final step and output

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| target | string | Yes | The target to operate on |
| options | object | No | Additional configuration |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| result | string | What was accomplished |
| files | string[] | Files that were modified |

## Example Usage

```
Run agent-name on src/components/
```

Expected output:
```
Completed: reviewed 5 files | issues:3 | suggestions:7
```

## Constraints

- Will not modify files without explicit confirmation
- Operates only within specified directory
- Does not make breaking changes
