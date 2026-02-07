# Linear Comment Template

Format for checkpoint comments posted to Linear tickets.

---

## Template

```markdown
## [CHECKPOINT] - Session Handoff ({YYYY-MM-DD})

### Context Summary
**Original ask:** {What the user originally requested}
**Approach:** {What approach was chosen and why}
**Remaining:** {What's left to do}

### Decisions Made
- {Decision 1} - {rationale}
- {Decision 2} - {rationale}
- ...

*{N} decisions superseded during session (not shown)*

### Files Touched
- `{path/to/file1.ts}` - {what changed}
- `{path/to/file2.md}` - {what changed}
- ...

### Open Questions
- {Unresolved question 1}
- {Unresolved question 2}
- ...

### Investigation (if debugging/blocked)

**Working Path:**
1. `{file.tsx:line}` - {what happens here}
2. `{file.tsx:line}` - {next step in flow}
3. {Result/outcome}

**Broken Path:**
1. `{file.tsx:line}` - {entry point}
2. `{file.tsx:line}` - {where it breaks}
3. {Observed problem}

**Code References:**
- `{file.tsx:line}` - {why relevant}

**What We Tried:**
- {Approach} - {why it didn't work}

### Next Steps
1. {First priority item}
2. {Second priority item}
3. ...

**Transcript:** [View conversation]({transcript_url})

---
*Checkpointed by Claude Code*
```

---

## Field Guidelines

### Context Summary (NEW)

Three-part compression format:

| Field | Content | Example |
|-------|---------|---------|
| **Original ask** | User's initial request (1 sentence) | "Add dark mode toggle to settings" |
| **Approach** | What was chosen and why (1-2 sentences) | "Using CSS variables for theming because it's simpler than context-based approach" |
| **Remaining** | What's left to complete (bullet or sentence) | "Need to add toggle component and persist preference" |

### Decisions Made

- Include only `CURRENT` decisions (not superseded)
- Format: "{Decision} - {rationale}"
- Include superseded count at bottom if any
- Skip section if no decisions were made

**Examples:**
```markdown
- Using SQLite instead of PostgreSQL - simpler for prototype phase
- Component-based architecture - matches existing patterns in codebase

*2 decisions superseded during session (not shown)*
```

### Files Touched

- Files that were read, written, or modified
- Include brief note on what changed
- Use relative paths from repo root
- Skip common files (CLAUDE.md, package.json, node_modules)

**Examples:**
```markdown
- `src/components/Settings.tsx` - added dark mode toggle
- `src/styles/theme.css` - new CSS variables for dark theme
```

### Open Questions

- Unresolved items that need answers
- Technical unknowns
- Decisions deferred to user
- Blockers

### Next Steps

- Ordered by priority (most important first)
- Should be actionable
- Include enough context to start immediately
- Skip if obvious from remaining work

### Investigation (if debugging/blocked)

Only include when session involved debugging or hit a blocker.

**Working Path:** Trace of code execution that works correctly
- List file:line refs in execution order
- End with what works

**Broken Path:** Trace of code execution that fails
- List file:line refs in execution order
- End with observed problem/error

**Code References:** Files explored but not part of a path
- Include any file:line that might help the next session
- Note why each is relevant

**What We Tried:** Approaches that didn't work
- Include reasoning so they aren't repeated

**Auto-detection:** Claude suggests file:line refs from recent Grep/Read tool calls. User confirms which to include.

---

## CLI Usage

Use heredoc for multi-line comments:

```bash
npx tsx .claude/tools/linear-cc/src/index.ts create-comment DIS-XXX "$(cat <<'EOF'
## [CHECKPOINT] - Session Handoff (2026-01-12)

### Context Summary
**Original ask:** Implement user authentication
**Approach:** Using JWT tokens with httpOnly cookies for security
**Remaining:** Need to add refresh token rotation

### Decisions Made
- JWT over sessions - stateless scaling benefit
- httpOnly cookies - XSS protection

### Files Touched
- `src/auth/jwt.ts` - token generation
- `src/middleware/auth.ts` - validation middleware

### Open Questions
- Should refresh tokens expire after 7 or 30 days?

### Next Steps
1. Implement refresh token rotation
2. Add logout endpoint
3. Write integration tests

**Transcript:** [View conversation](https://linear.app/dispo/document/transcript-dis-xxx-2026-01-12-1234-abc123)

---
*Checkpointed by Claude Code*
EOF
)"
```

---

## Comparison with Other Comment Types

| Header | Purpose | When to Use |
|--------|---------|-------------|
| `[CHECKPOINT]` | Context handoff between sessions | End of session, topic switch |
| `[COMMIT]` | Code changes pushed | After git push |
| `[PROGRESS]` | Mid-work status update | During long tasks |
| `[DECISION]` | Single design decision | Important choice made |

Use `[CHECKPOINT]` for full session handoffs. Use other headers for incremental updates.
