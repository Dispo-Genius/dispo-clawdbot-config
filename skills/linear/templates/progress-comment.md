# Progress Comment Templates

Templates for structured Linear comments. Use consistent headers for easy scanning.

---

## Progress Update `[PROGRESS]`

For mid-work status updates. Use when significant progress made but not checkpointing.

```markdown
## [PROGRESS] - {Brief summary}

**Status:** {In Progress | Blocked | Near Complete}

### What's Done
- {Completed item 1}
- {Completed item 2}

### What's Next
- {Next priority item}

### Blockers (if any)
- {Blocker description}

---
*Updated by Claude Code*
```

**Example:**
```markdown
## [PROGRESS] - Auth middleware complete

**Status:** In Progress

### What's Done
- JWT token validation middleware
- httpOnly cookie handling
- Error response formatting

### What's Next
- Refresh token rotation
- Logout endpoint

---
*Updated by Claude Code*
```

---

## Decision `[DECISION]`

For documenting a single important design decision.

```markdown
## [DECISION] - {Decision title}

**Chose:** {What was chosen}
**Over:** {Alternative(s) considered}
**Because:** {Rationale}

### Trade-offs
- **Pros:** {Benefits}
- **Cons:** {Drawbacks}

---
*Recorded by Claude Code*
```

**Example:**
```markdown
## [DECISION] - State management approach

**Chose:** React Context + useReducer
**Over:** Redux, Zustand, Jotai
**Because:** Minimal bundle size, no external deps, sufficient for app complexity

### Trade-offs
- **Pros:** Zero dependencies, familiar patterns, good TypeScript support
- **Cons:** Less middleware support, manual optimization for large state

---
*Recorded by Claude Code*
```

---

## Commit `[COMMIT]`

For documenting code changes pushed to remote.

```markdown
## [COMMIT] - {Commit message summary}

**Branch:** `{branch-name}`
**Files:** {count} files changed

### Changes
- `{file1.ts}` - {what changed}
- `{file2.ts}` - {what changed}

### Verification
- [x] Typecheck passed
- [x] Build passed
- [ ] Tests passed (if applicable)

---
*Committed by Claude Code*
```

---

## Blocker `[BLOCKED]`

For documenting blockers that need attention.

```markdown
## [BLOCKED] - {Brief description}

**Blocking:** {What can't proceed}
**Need:** {What's required to unblock}

### Context
{Description of the blocker and what was tried}

### Attempted Solutions
1. {What was tried} - {Why it didn't work}
2. {What was tried} - {Why it didn't work}

---
*Reported by Claude Code*
```

---

## CLI Usage

```bash
# Progress update
npx tsx .claude/tools/linear-cc/src/index.ts create-comment DIS-XXX "$(cat <<'EOF'
## [PROGRESS] - Auth middleware complete

**Status:** In Progress

### What's Done
- JWT token validation

### What's Next
- Refresh token rotation

---
*Updated by Claude Code*
EOF
)"

# With screenshot attachment
npx tsx .claude/tools/linear-cc/src/index.ts upload-attachment \
  --issue DIS-XXX \
  --file /tmp/screenshot.png \
  --title "Error screenshot"
```

---

## When to Use Each

| Header | Use When | Frequency |
|--------|----------|-----------|
| `[PROGRESS]` | Significant milestone, want visibility | As needed |
| `[DECISION]` | Important choice that affects future work | Each decision |
| `[COMMIT]` | Code pushed to remote | Each push |
| `[BLOCKED]` | Can't proceed without help | When stuck |
| `[CHECKPOINT]` | Full session handoff | End of session |
