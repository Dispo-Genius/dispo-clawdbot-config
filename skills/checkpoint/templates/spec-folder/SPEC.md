# Spec Folder Template: SPEC.md

Template for the main spec file when using folder structure.

---

<template name="spec-folder-main">
```markdown
# {Title}

**Linear:** [{TICKET}](https://linear.app/dispogenius/issue/{TICKET})
**Status:** {In Progress | Blocked | Near Complete | Done}
**Sessions:** {N} (latest: {YYYY-MM-DD})

## Overview

{Brief description of what this spec covers - 2-3 sentences max}

## Requirements

- [ ] {Requirement 1}
- [ ] {Requirement 2}
- [ ] {Requirement 3}

## Acceptance Criteria

- [ ] {Criterion 1 - specific, testable}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

## Decisions (PRESERVED - DO NOT DELETE)

<!--
Key decisions extracted from session logs.
These represent institutional knowledge - never delete.
New sessions should CHECK this section before re-deciding anything.
-->

| Decision | Rationale | Session | Date |
|----------|-----------|---------|------|
| {Decision 1} | {Why} | {N} | {YYYY-MM-DD} |
| {Decision 2} | {Why} | {N} | {YYYY-MM-DD} |

## Quick Context (Latest Session)

{2-3 sentences summarizing the most recent session's state and immediate next steps}

## Session History

See [sessions/](./sessions/) for full logs.

| # | Date | Status | Summary |
|---|------|--------|---------|
| {N} | {YYYY-MM-DD} | {Status} | {One-line summary} |
| {N-1} | {YYYY-MM-DD} | {Status} | {One-line summary} |
| {N-2} | {YYYY-MM-DD} | {Status} | {One-line summary} |

## References

<!-- Optional: Link to reference docs in references/ folder -->

- [API Documentation](./references/api.md)
- [Research Notes](./references/research.md)
```
</template>

---

## Usage Notes

### When to Use This Template

- Restructuring an existing single-file spec into folder format
- Creating a new spec for a complex, multi-session feature
- Spec is expected to span >5 sessions

### Required Sections

| Section | Purpose | Can be empty? |
|---------|---------|---------------|
| Overview | What this is about | No |
| Requirements | What needs to be done | No |
| Acceptance Criteria | How to know it's done | No |
| **Decisions** | Preserved institutional knowledge | Start empty, grows |
| Quick Context | Current state snapshot | No |
| Session History | Table of all sessions | No |

### Decisions Section Rules

1. **NEVER delete decisions** - they're institutional knowledge
2. New sessions should READ this first before making choices
3. If a decision changes, ADD a new row (don't edit old ones)
4. Include session # and date for traceability

### Quick Context Guidelines

- Should be updated EVERY session
- 2-3 sentences max
- Answer: "What's the current state?" and "What's the immediate next step?"
- This is what the next session reads FIRST

### Session History Table

- One row per session
- Keep ALL sessions (don't delete old ones)
- Summary should be ~10 words
- Most recent session at TOP
