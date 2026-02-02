# Skill Rules

Standards for structuring and registering skills.

## YAML Frontmatter

Every SKILL.md **must** have frontmatter:

```yaml
---
name: skill-name
description: Brief description. Triggers on "keyword1", "keyword2", "phrase".
---
```

| Field | Required | Notes |
|-------|----------|-------|
| name | Yes | Lowercase, hyphenated |
| description | Yes | Must end with trigger keywords |
| model | No | opus/sonnet/haiku if specific model needed |

## Trigger Keywords

Description **must** end with: `Triggers on "keyword1", "keyword2", "multi-word phrase".`

Good triggers:
- Action verbs: "commit", "deploy", "create"
- Noun phrases: "new ticket", "pull request"
- Natural phrases: "ready to ship", "what changed"

## SKILL.md Structure

| Rule | Threshold | Fix |
|------|-----------|-----|
| Line count | < 100 lines | Extract to references/ |
| Role | Router/TOC only | Move details out |
| Links | Reference all detail files | Add relative links |

**SKILL.md pattern:**
```markdown
# Skill Name

Brief description (1-2 sentences).

## When to Use
- Bullet list of scenarios

## Workflow
High-level steps with links to details.

## References
- [Detail Topic](references/topic.md)
```

## skill-rules.json Entry

Every skill needs a registry entry:

```json
"skill-name": {
  "priority": "medium",
  "autoActivate": true,
  "description": "Brief description",
  "keywords": ["keyword1", "keyword2"],
  "intentPatterns": ["regex.*pattern"]
}
```

| Field | Values | Notes |
|-------|--------|-------|
| priority | critical/high/medium/low | Determines activation order |
| autoActivate | true/false | Whether to auto-suggest |
| keywords | string[] | Exact match triggers |
| intentPatterns | string[] | Regex for fuzzy matching |

## Behavioral Directives

| Directive | When to Include |
|-----------|-----------------|
| "Use TaskCreate/TaskUpdate to track steps" | Multi-step workflows (3+) |
| "Use AskUserQuestion for..." | Decision points |
| "Deploy Explore agents" | Discovery phases |
| "Generate report as..." | Output-producing skills |

## Frontmatter Directives

### disable-model-invocation

Prevents auto-activation; skill only runs when explicitly invoked via `/skill-name`:

```yaml
---
name: deploy
description: Deploy to production. Triggers on "deploy", "ship", "release".
disable-model-invocation: true
---
```

**Use for:**
- Destructive actions (deploys, deletes)
- Side effects (sending emails, notifications)
- Manual-only workflows

### $ARGUMENTS Variable

Access arguments passed via `/skill-name args`:

```markdown
## Workflow

1. Parse issue number from $ARGUMENTS
2. Fetch issue details: `gh issue view $ARGUMENTS`
3. ...
```

**Example invocation:** `/fix-issue 123` → $ARGUMENTS = "123"

## Workflow Skill Pattern

Numbered steps for complex multi-stage workflows:

```markdown
---
name: fix-issue
description: Fix a GitHub issue end-to-end. Triggers on "fix issue", "work on issue".
---

# Fix Issue

## Workflow

**Step 1: Fetch Issue**
- Parse issue number from $ARGUMENTS
- Run: `gh issue view $ARGUMENTS --json title,body,labels`
- Extract acceptance criteria

**Step 2: Investigation**
- Search codebase for relevant files
- Identify root cause
- Document findings

**Step 3: Implementation**
- Create fix branch: `git checkout -b fix/$ARGUMENTS`
- Implement changes
- Run tests: `npm test`

**Step 4: Verification**
- Verify all acceptance criteria met
- Run full test suite
- Update issue with fix summary

**Step 5: PR Creation**
- Push branch
- Create PR linking issue: `gh pr create --body "Fixes #$ARGUMENTS"`
```

**Key patterns:**
- Numbered steps for sequential execution
- Bash commands inline for clarity
- Verification step before completion

## Directory Structure

```
skill-name/
├── SKILL.md           # Router (< 100 lines)
├── references/        # Detailed guidance
│   ├── topic1.md
│   └── topic2.md
└── examples/          # Sample outputs
    └── sample.md
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No frontmatter | Won't be recognized | Add YAML block |
| Missing triggers | Poor discovery | Add trigger keywords |
| Long SKILL.md | Context bloat | Extract to references |
| No JSON entry | Won't auto-activate | Add to skill-rules.json |
| Inline code | Hard to maintain | Move to examples/ |
