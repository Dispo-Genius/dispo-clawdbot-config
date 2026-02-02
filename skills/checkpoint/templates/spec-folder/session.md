# Spec Folder Template: Session Log

Template for individual session files in `sessions/` folder.

---

<template name="session-log">
```markdown
# Session {NNN} - {YYYY-MM-DD}

**Status:** {In Progress | Blocked | Near Complete | Done}
**Duration:** {Approximate session length if known}

## What I Did

- {Concrete accomplishment 1}
- {Concrete accomplishment 2}
- {Concrete accomplishment 3}

## Decisions Made

<!--
Key decisions from THIS session.
These get promoted to main SPEC.md Decisions table.
-->

| Decision | Rationale |
|----------|-----------|
| {Decision 1} | {Why - be specific} |
| {Decision 2} | {Why} |

## Files Changed

| File | Change |
|------|--------|
| `{path/to/file.ts}` | {What changed} |
| `{path/to/file.ts}` | {What changed} |

## Blockers/Issues

{Any problems encountered and how they were resolved}

{Or "None" if no blockers}

## Next Session Should

1. {First priority - specific and actionable}
2. {Second priority}
3. {Third priority if applicable}

## Notes

<!--
Optional: Any additional context, links, or observations
that might be useful for future sessions
-->

{Free-form notes}
```
</template>

---

## Usage Notes

### File Naming

Sessions use zero-padded numbers for sorting:
- `session-001.md` (first session)
- `session-002.md`
- `session-010.md`
- `session-100.md`

### Required Sections

| Section | Purpose | Can be empty? |
|---------|---------|---------------|
| What I Did | Concrete accomplishments | No - must have at least 1 |
| Decisions Made | Choices with rationale | Yes - "None this session" |
| Files Changed | What was modified | Yes - if research session |
| Blockers/Issues | Problems and resolutions | Yes - write "None" |
| Next Session Should | Priorities for continuation | No - always have next steps |

### Writing Style

**What I Did:**
- Use past tense
- Be specific: "Fixed authentication bug in LoginForm.tsx" not "Worked on auth"
- Include measurable outcomes: "Reduced API calls by 40%"

**Decisions:**
- Include rationale - "because" is required
- Future sessions will reference these
- If you change a previous decision, note what changed and why

**Next Session Should:**
- Imperative form: "Fix X", "Add Y", "Test Z"
- Ordered by priority
- Specific enough to start immediately

### Integration with Main SPEC.md

When checkpoint runs:
1. Creates new session file: `sessions/session-{NNN}.md`
2. Updates SPEC.md Quick Context with summary
3. Adds row to Session History table
4. Promotes any new Decisions to main Decisions table
