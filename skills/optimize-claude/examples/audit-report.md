# Audit Report Example

Sample output format for /optimize-claude audits.

---

## Project: example-project

**Audit Date:** 2024-01-15
**Scope:** Global (~/.claude) + Project (./.claude)
**Overall Grade:** B

---

## Summary

| Category | Critical | Warning | Suggestion |
|----------|----------|---------|------------|
| CLAUDE.md | 0 | 1 | 2 |
| Skills | 1 | 2 | 0 |
| Agents | 0 | 1 | 1 |
| Config | 0 | 0 | 1 |
| **Total** | **1** | **4** | **4** |

---

## Critical Issues

### Skills

1. **Missing frontmatter: `skills/deploy/SKILL.md`**
   - Problem: No YAML frontmatter found
   - Impact: Skill won't be recognized by activation system
   - Fix: Add `---\nname: deploy\ndescription: ...\n---`

---

## Warnings

### CLAUDE.md

1. **Line count: 187 lines (threshold: 150)**
   - Location: `.claude/CLAUDE.md`
   - Suggestion: Move "Git Workflow" section to `skills/commit/references/`

### Skills

2. **Missing skill-rules.json entry: `analyze-data`**
   - Location: `skills/analyze-data/SKILL.md`
   - Impact: Skill won't auto-activate
   - Fix: Add entry to skill-rules.json

3. **Missing trigger keywords: `debugging`**
   - Location: `skills/debugging/SKILL.md`
   - Current: "Systematic bug diagnosis methodology"
   - Suggested: Add `Triggers on "broken", "not working", "error", "bug".`

### Agents

4. **No model specified: `agents/data-analyst.md`**
   - Impact: Uses default model (may be expensive)
   - Fix: Add `model: haiku` to frontmatter

---

## Suggestions

### CLAUDE.md

1. **Convert prose to table: "Commands" section**
   - Current: Paragraph format
   - Suggested: Table with Command | Purpose columns

2. **Extract inline example: "Commit message format"**
   - Location: Lines 45-60
   - Suggested: Move to `skills/commit/examples/`

### Agents

3. **Consider converting to skill: `agents/code-explainer.md`**
   - Reason: Produces guidance, not discrete output
   - Alternative: Create `skills/explain-code/`

### Config

4. **Add statusLine configuration**
   - Location: `.claude/settings.json`
   - Benefit: Visual feedback during operations

---

## Auto-Fixable Items

The following can be automatically fixed:

| # | Issue | Action |
|---|-------|--------|
| 1 | Missing frontmatter (deploy) | Add YAML block |
| 2 | Missing skill-rules.json (analyze-data) | Add entry |
| 3 | Missing triggers (debugging) | Append to description |
| 4 | Missing model (data-analyst) | Add model: haiku |

**Fix all?** [Yes, fix them] [Show changes first] [Skip]

---

## Manual Action Required

These require human judgment:

1. **Restructure CLAUDE.md**
   - Decide which sections to extract
   - Choose destination (skills/ vs rules/)

2. **Convert code-explainer agent to skill**
   - Determine if agent or skill is better fit
   - May need different trigger strategy

---

## Improvement Roadmap

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Fix critical issues | Low |
| 2 | Add missing entries | Low |
| 3 | Restructure CLAUDE.md | Medium |
| 4 | Convert agent to skill | Medium |
| 5 | Add config enhancements | Low |
