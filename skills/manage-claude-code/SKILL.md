---
name: manage-claude-code
description: Use Claude Code CLI for coding tasks. Delegate complex code work to CC sessions. Triggers on "code task", "implement", "create file", "edit code", "fix bug", "refactor", "use claude code".
metadata: {"clawdbot":{"emoji":"💻","requires":{"bins":["cc"]}}}
---

# Claude Code Delegation

Spawn Claude Code sessions to execute coding tasks autonomously.

## Quick Start

```bash
cc --cwd ~/project "task"  # Start in specific repo
cc "task"                  # Start in current repo (must be in git repo)
cc -c                      # Continue last session
cc --list                  # List sessions
```

## When to Delegate

Use Claude Code for:
- **Code modifications** - Creating files, editing code, refactoring
- **Complex analysis** - Understanding codebases, finding bugs, code review
- **Multi-step tasks** - Tasks requiring multiple tool calls

## When NOT to Delegate

Answer directly for:
- Simple questions about code
- Explanations or documentation requests
- When user just wants discussion/planning

## CLI Commands

| Command | Description |
|---------|-------------|
| `cc "prompt"` | Start session in current repo |
| `cc --cwd <path> "prompt"` | Start in specified repo |
| `cc -c` | Continue most recent session |
| `cc --list` | List recent sessions |

## Spawn Script (for automation)

```bash
# Set default project (optional)
export CC_DEFAULT_PROJECT=~/my-project

# Run
{baseDir}/scripts/spawn.sh "prompt" --cwd ~/repo
{baseDir}/scripts/spawn.sh "prompt"  # Uses CC_DEFAULT_PROJECT
```

## Example Delegation Flow

1. User asks: "Create a React Button component"
2. Confirm: "I'll delegate this to Claude Code. Proceed?"
3. Run: `cc --cwd ~/project "Create a React Button component"`
4. Report result summary to user
