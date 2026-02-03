# Skill Patterns

How to create well-structured Claude Code skills.

## Critical Insight: Description vs Body

**The description field in YAML frontmatter is the ONLY content Claude sees before triggering.**

The body (everything below the frontmatter) is only loaded AFTER the skill triggers. This means:
- "When to Use" sections in the body are useless - Claude has already decided to use the skill
- All trigger context must be in the description field
- Body content is for execution guidance, not triggering decisions

## Directory Structure

```
~/.claude/skills/[skill-name]/
├── SKILL.md                 # Required: main documentation
├── references/              # Optional: deep-dive guides loaded as needed
│   └── topic.md
├── assets/                  # Optional: templates, starter files, icons
│   └── template.md
├── scripts/                 # Optional: executable code for deterministic operations
│   └── init.sh
└── examples/                # Optional: real output examples
    └── example.md
```

**Directory conventions:**
- `scripts/` - Executable code for deterministic reliability
- `references/` - Documentation loaded as needed
- `assets/` - Files used in output (templates, icons, fonts)

## Progressive Disclosure

Three-level loading minimizes context usage:

| Level | Content | When Loaded | Size Target |
|-------|---------|-------------|-------------|
| 1 | YAML frontmatter (name, description) | Always in context | ~100 words |
| 2 | SKILL.md body | When skill triggers | <5k words |
| 3 | references/, assets/, scripts/ | When explicitly needed | Unlimited |

**Implications:**
- Keep SKILL.md body under 5k words
- Move detailed documentation to references/
- Move templates and scaffolds to assets/
- Put executable logic in scripts/

## SKILL.md Format

```markdown
---
name: skill-name-kebab-case
description: What this skill does. Triggers on "keyword1", "keyword2", "keyword3".
---

# Full Title

Brief context (1-2 sentences max).

## Core Principles (if applicable)

Key concepts that guide execution.

## Main Workflow

[Primary content - what Claude needs to execute the skill]

## References

- [Reference Name](references/file.md) - Description
```

**Note:** No "When to Use" section - that information belongs in the description field.

## Description Field

The `description` in YAML frontmatter is critical for discoverability:

```yaml
description: [What the skill does]. Triggers on "[keyword1]", "[keyword2]", "[keyword3]".
```

**Pattern:**
1. First part: What the skill does (1-2 sentences)
2. Last part: Trigger keywords for when Claude should use it

**Examples:**
```yaml
# Good - clear purpose + triggers
description: Create Claude Code extensions. Triggers on "create tool", "new skill", "authoring".

# Good - action-oriented + triggers
description: Deploy code and generate release notes. Triggers on "deploy", "ship it", "release".

# Bad - no triggers
description: A skill for helping with deployment tasks.
```

## Degrees of Freedom

Match specificity to task fragility:

| Freedom Level | When to Use | Format |
|---------------|-------------|--------|
| High (instructions) | Multiple valid approaches | Describe outcomes, not steps |
| Medium (pseudocode) | Preferred pattern with variation | Show structure, allow adaptation |
| Low (scripts/) | Fragile operations, consistency critical | Executable code in scripts/ |

**Examples:**
- High: "Generate a commit message that summarizes the changes"
- Medium: "Follow this structure: summary line, blank line, bullet points"
- Low: `scripts/commit.sh` with exact git commands

## What NOT to Include

Skills should not contain:
- README.md, INSTALLATION_GUIDE.md, CHANGELOG.md
- Auxiliary context about the process of creating the skill
- Information Claude already knows (standard programming concepts)
- Verbose explanations when concise ones suffice

**Rule:** Every word must earn its place. Context window is a public good.

## Conciseness Guidelines

1. **Challenge each piece of information** - Does Claude already know this?
2. **Delete before adding** - What can be removed without losing value?
3. **Use tables and lists** - More scannable than paragraphs
4. **Reference, don't repeat** - Link to references/ instead of duplicating

## Skill Types

### 1. Methodology Skills

**Purpose:** Teach a process or workflow
**Examples:** `debugging`, `reasoning`

**Structure:**
- Step-by-step phases in SKILL.md
- Deep dives in `references/`
- Real examples in `examples/`

### 2. Component/Code Skills

**Purpose:** Provide reusable code and patterns
**Examples:** `building-ui`

**Structure:**
- Code organized in subdirectories by category
- Canonical specs in JSDoc comments
- Token/config files for design values

### 3. Process Skills

**Purpose:** Guide through specific tasks
**Examples:** `deploy`, `commit`

**Structure:**
- Clear workflow steps
- Executable scripts in `scripts/`
- Config files for automation

## Quick Start Checklist

- [ ] Create skill folder: `~/.claude/skills/[skill-name]/`
- [ ] Write SKILL.md with YAML frontmatter
- [ ] Put ALL trigger context in description field
- [ ] Keep body under 5k words
- [ ] Create references/ for deep dives
- [ ] Create scripts/ for deterministic operations
- [ ] Create assets/ for templates and starter files
- [ ] Test that skill triggers on expected keywords
