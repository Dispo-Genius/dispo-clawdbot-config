# CLAUDE.md Rules

Standards for optimizing the main CLAUDE.md instruction file.

## Size Limits

| Metric | Threshold | Action |
|--------|-----------|--------|
| Total lines | < 150 | Move excess to skills/rules |
| Section length | < 30 lines | Extract to reference file |
| Table rows | < 15 per table | Split or link to detail |

## Structure Requirements

| Rule | Check | Fix |
|------|-------|-----|
| No inline workflows | 0 multi-step procedures | Extract to skill |
| Table format | Commands/skills/tools in tables | Convert prose to tables |
| No duplication | Content not repeated elsewhere | Delete duplicates |
| Links over content | Reference files > inline | Add links, remove inline |
| Section headers | Clear hierarchy (## / ###) | Restructure |

## Content Organization

### Include/Exclude Table

| Include | Exclude | Why |
|---------|---------|-----|
| Tech stack | Step-by-step tutorials | Claude knows frameworks |
| Build/test commands | Obvious commands (`npm install`) | Focus on project-specific |
| Code style (if unusual) | Standard conventions | Claude follows defaults |
| Architecture decisions | Design rationale | Keep it action-oriented |
| Project-specific terms | Industry standard terms | Context over explanation |
| Common errors + fixes | Debugging guides | Targeted help |

**Pruning test:** "Would removing this cause Claude to make mistakes?" If no → delete.

### What Belongs Where

| Content Type | Location | Example |
|--------------|----------|---------|
| Project identity | CLAUDE.md | "React 19 / TypeScript / Tailwind" |
| Writing style | CLAUDE.md | "Be concise. No fluff." |
| Command quick-ref | CLAUDE.md | `npm run dev` table |
| Skill quick-ref | CLAUDE.md | `/commit`, `/spec` table |
| Multi-step workflows | skills/ | Deployment procedures |
| Detailed guidelines | rules/ | TypeScript conventions |
| Examples | skill references/ | Sample outputs |
| Tool docs | tools/ README | CLI usage |

## Import Syntax

Use `@path/to/file` to include external files into CLAUDE.md:

```markdown
# Project Setup
@.claude/rules/typescript.md
@.claude/rules/testing.md
```

**When to use imports:**
- CLAUDE.md exceeds 150 lines
- Multiple rule files share common content
- Team members maintain separate rule sets

**Import resolution:** Paths relative to repo root.

## Emphasis Tuning

Use emphasis strategically to highlight critical instructions:

| Level | Syntax | When to Use |
|-------|--------|-------------|
| Normal | Plain text | Default guidance |
| Important | `**bold**` | Key points Claude might miss |
| Critical | `IMPORTANT:` prefix | Must-follow rules |
| Mandatory | `YOU MUST` / `NEVER` | Absolute requirements |

**Example:**
```markdown
## API Calls
Use the REST client for external calls.
**IMPORTANT:** Always include retry logic.
YOU MUST log all API errors to Sentry.
NEVER expose API keys in responses.
```

**Anti-pattern:** Overusing emphasis dilutes impact. Reserve `IMPORTANT`/`MUST`/`NEVER` for actual requirements.

## Formatting Standards

| Element | Format |
|---------|--------|
| Commands | `npm run X` in table |
| Skills | `/skill-name` in table |
| File paths | Backticks with relative path |
| Code examples | Fenced blocks with language |

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Prose paragraphs | Low density | Convert to table/bullets |
| "Don't forget to..." | Buried instruction | Extract to checklist |
| Inline examples | Bloat | Move to examples/ |
| Repeated rules | Duplication | Single source in rules/ |
