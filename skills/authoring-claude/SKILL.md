---
name: authoring-claude
description: Create Claude Code extensions. Triggers on "create tool", "new skill", "add agent", "write hook", "authoring", "-cc tool".
---

# Authoring Claude Code Extensions

Comprehensive guide for creating tools, skills, agents, and hooks.

## Critical Rules

### GLOBAL ONLY - No Project-Specific Extensions

**NEVER create skills, tools, agents, or hooks in project `.claude/` directories.**

All extensions MUST be created in the global config:
- **Location:** `~/claude-config/` (symlinked as `~/.claude/`)
- **Project `.claude/`:** Should ONLY contain `CLAUDE.md` (project instructions)

This ensures:
- Single source of truth for all extensions
- Consistent behavior across projects
- Easier maintenance and version control

```
✓ ~/claude-config/skills/my-skill/SKILL.md     # Correct
✗ ~/my-project/.claude/skills/my-skill/        # WRONG - never do this
```

## Core Principles

### Conciseness
Context window is a public good. Only add context Claude doesn't already have. Challenge each piece of information - if Claude already knows it, delete it.

### Degrees of Freedom
Match specificity to task fragility:
- **High freedom (instructions):** Multiple valid approaches - describe outcomes, not steps
- **Medium freedom (pseudocode):** Preferred pattern with variation allowed
- **Low freedom (scripts):** Fragile operations requiring consistency - provide executable code

### Progressive Disclosure
Three-level loading minimizes context usage:
1. **Metadata:** YAML frontmatter always in context (~100 words)
2. **Body:** SKILL.md content loaded when triggered (<5k words)
3. **Resources:** references/, assets/ loaded as needed (unlimited)

## Quick Decision

| Extension Type | When to Use | Key Files |
|---------------|-------------|-----------|
| Tool | CLI wrapper for external service | `package.json`, `src/*.ts` |
| Skill | Methodology, process, or component guide | `SKILL.md` |
| Agent | Autonomous task executor | `AGENT.md` |
| Hook | System-level automation | `.mjs/.sh` scripts |

## Authoring Workflow

### 1. Choose Type

**Tool** if:
- Wrapping an external CLI or API
- Need token-efficient output for LLM consumption
- Commands like `status`, `list`, `create`

**Skill** if:
- Teaching a methodology or workflow
- Providing reference documentation
- Guiding component usage

**Agent** if:
- Autonomous multi-step task execution
- Needs to run independently

**Hook** if:
- Automating on tool invocation
- Pre/post action automation

### 2. Read Reference

- [TOON Format](references/toon-format.md) - Token-efficient output for tools
- [Tool Patterns](references/tool-patterns.md) - Commander.js, output utilities
- [Skill Patterns](references/skill-patterns.md) - SKILL.md structure
- [Agent Patterns](references/agent-patterns.md) - AGENT.md structure
- [CLAUDE.md Updates](references/claude-md-updates.md) - Registration checklist

### 3. Use Template

```bash
# Tool
cp -r ~/.claude/skills/authoring-claude/assets/tool-template ~/.claude/tools/my-tool-cc

# Skill
~/.claude/skills/authoring-claude/scripts/init_skill.sh my-new-skill

# Agent
# Use assets/agent-template.md as starting point
```

### 4. Implement

Follow patterns from references. Key principles:
- Tools use TOON format for compact output
- Skills put trigger context in description, not body
- Agents define autonomous behaviors

### 5. Register

Update CLAUDE.md to register the extension. See [CLAUDE.md Updates](references/claude-md-updates.md).

## Tool Naming Convention

All tools use `-cc` suffix. Services are routed through `gateway-cc`:
- `gateway-cc exec github` - Git/GitHub operations (unified)
- `linear-cc` - Linear issue tracking
- `diagram-cc` - Diagram management

## Directory Locations

**Canonical source:** `~/claude-config/` (symlinked as `~/.claude/`)

```
~/claude-config/                    # Edit here (visible in Finder/IDE)
├── tools/                          # gateway-cc + standalone utils
│   └── gateway-cc/                 # Routes to services/
├── services/                       # Service implementations
│   ├── github-cc/
│   ├── linear-cc/
│   └── ...
├── skills/                         # Skill documentation
│   ├── authoring-claude/           # THIS FILE - source of truth
│   ├── building-ui/
│   └── ...
├── agents/                         # Agent definitions
└── CLAUDE.md                       # Global config

~/.claude -> ~/claude-config        # Symlink - Claude reads from here
```

**Project directories:** Only `CLAUDE.md` allowed
```
~/my-project/.claude/
└── CLAUDE.md                       # Project-specific instructions ONLY
```

## Skill + Service Pattern

When a skill needs a CLI backend, use the **skill + service** pattern:

```
~/claude-config/
├── skills/
│   └── manage-<name>/
│       └── SKILL.md           # Documentation: how to use
└── services/
    └── <name>-cc/
        ├── package.json       # Dependencies
        ├── src/index.ts       # CLI implementation
        ├── gateway.json       # Gateway registration
        └── TOOL.md            # Tool documentation
```

### How It Works

1. **Skill** (`manage-<name>/SKILL.md`) - Documentation for Claude:
   - Triggers on keywords
   - Documents all commands
   - Shows usage examples

2. **Service** (`<name>-cc/`) - TypeScript CLI implementation:
   - Registered with gateway-cc via `gateway.json`
   - Called via: `npx tsx ~/.claude/services/gateway-cc/src/index.ts exec <name> <command>`

### Example: manage-github + github-cc

```
skills/manage-github/SKILL.md    # Docs: "Use github service for git ops"
services/github-cc/              # Implementation: status, diff, commit, etc.
```

Skill invocation:
```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github status
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github diff --staged
```

### Creating a New Skill + Service

1. Create service: `cp -r services/github-cc services/myservice-cc`
2. Register with gateway: Add to `gateway.json`
3. Create skill: `mkdir skills/manage-myservice && touch skills/manage-myservice/SKILL.md`
4. Document commands in SKILL.md

## Assets

- [Tool Template](assets/tool-template/) - Starter files for new -cc tools
- [Skill Template](assets/skill-template.md) - SKILL.md starting point
- [Agent Template](assets/agent-template.md) - AGENT.md starting point
