# Audit Checklist

Quick reference for .claude directory audits.

## CLAUDE.md

- [ ] Total lines < 150
- [ ] No inline multi-step workflows
- [ ] Commands in table format
- [ ] Skills in table format
- [ ] No duplicated content from skills/rules
- [ ] Links to detail files, not inline content
- [ ] Uses @imports for large sections (if > 150 lines)
- [ ] Emphasis used sparingly (IMPORTANT/MUST/NEVER)

## Skills

- [ ] Every skill has YAML frontmatter
- [ ] Frontmatter has `name` and `description`
- [ ] Description ends with "Triggers on..."
- [ ] SKILL.md < 100 lines (router only)
- [ ] Detail content in references/ subdirectory
- [ ] Multi-step skills mention TaskCreate/TaskUpdate
- [ ] Decision points mention AskUserQuestion
- [ ] Skill registered in skill-rules.json
- [ ] Skills with side effects use `disable-model-invocation`
- [ ] Workflow skills use $ARGUMENTS for inputs

## Agents

- [ ] Every agent has YAML frontmatter
- [ ] Frontmatter has `model` field
- [ ] Frontmatter has `tools` list
- [ ] Agent produces discrete output (not guidance)
- [ ] No trigger overlap with skills
- [ ] Subagents have scoped/minimal tools list
- [ ] Read-only agents exclude Edit/Write tools

## Configuration

- [ ] settings.json has statusLine
- [ ] settings.local.json has TypeScript hook
- [ ] No secrets in config files
- [ ] Deny rules for .env files
- [ ] Deny rules for secrets directory
- [ ] Write blocker hook for protected directories
- [ ] Lint hook (non-blocking) for code quality

## Tools

- [ ] CLI tools preferred over MCPs
- [ ] Tools have README with usage
- [ ] Entry point at src/index.ts
- [ ] Commands use env vars for auth

## Structure

- [ ] rules/ contains modular guidelines
- [ ] skills/ contains reusable workflows
- [ ] agents/ contains Task tool configs
- [ ] tools/ contains CLI utilities
- [ ] No orphaned files in root

## Scoring Guide

| Grade | Criteria |
|-------|----------|
| A | All critical + warnings addressed |
| B | All critical addressed |
| C | Some critical issues remain |
| D | Multiple critical issues |

## Critical Issues

Items that **must** be fixed:
- Security: Secrets in config
- Broken: Missing required frontmatter
- Bloat: CLAUDE.md > 300 lines

## Warnings

Items that **should** be fixed:
- CLAUDE.md 150-300 lines
- Missing skill-rules.json entries
- Missing trigger keywords
- Agents without model specified

## Suggestions

Nice-to-have improvements:
- Convert MCPs to CLI
- Add statusLine config
- Add more hooks
- Extract inline examples
