---
name: commit
description: ALWAYS use this skill when the user wants to commit changes. Triggers on "commit", "save", "push", "check in code". Follow each step in order - do not improvise git commands. Captures context for deploy release notes.
---

# Commit Skill

<instructions>
## When to Use

- After completing a feature, fix, or improvement
- When user asks to "commit", "save", or "push"
- When a logical unit of work is complete

## Invocation

- `/commit` - Commit and push to current branch
- `/commit --no-simplify` - Skip code simplifier
- `/commit --no-precheck` - Skip pre-commit checks
- `/commit --no-ux` - Skip UX review
</instructions>

---

## Process Overview

| Step | Purpose | Details |
|------|---------|---------|
| 1 | Verify branch | [Inline](#step-1-verify-branch) |
| 2 | Ticket gate | [ticket-gate.md](workflows/ticket-gate.md) |
| 3 | Spec metadata | [spec-detection.md](workflows/spec-detection.md) |
| 4 | Validate build | [Inline](#step-4-validate-build) |
| 5 | Pre-commit checks | [Inline](#step-5-pre-commit-checks) |
| 5B | UX review | [Inline](#step-5b-ux-review) |
| 6 | Code simplifier | [code-simplifier.md](workflows/code-simplifier.md) |
| 7 | Stage, commit, push | [commit-message.md](templates/commit-message.md) |

---

<procedure>

<step n="1" name="Verify Branch">
```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github status
```

<gate>
**If on `main` or `master`:**
- Warn user: "You're on the main branch. Consider creating a feature branch."
- Ask: Create a feature branch or continue on main?

**Otherwise:** Proceed on current branch.
</gate>
</step>

---

<step n="2" name="Ticket Gate">
**REQUIRED:** Every commit must link to a Linear ticket.

See [ticket-gate.md](workflows/ticket-gate.md) for full logic.

**Quick reference:**
```
IF LINEAR_ISSUE_ID in session → PROCEED
ELIF branch matches */dis-{N}-* → Validate & link
ELIF Linear search finds match → Auto-link or ask user
ELSE → Auto-create via /manage-linear create
```

**Output:** Sets `LINEAR_ISSUE_ID`, `LINEAR_ISSUE_IDENTIFIER`
</step>

---

<step n="3" name="Spec Metadata">
Extract `hasUI` and `hasUX` flags from the linked ticket.

See [spec-detection.md](workflows/spec-detection.md) for full logic.

**Output:**
- `hasUI` - for later use in /ship review gates
- `hasUX` - for later use in /ship review gates
</step>

---

<step n="4" name="Validate Build">
```bash
npm run typecheck && npm run build
```

<gate>
| Result | Action |
|--------|--------|
| No errors | Proceed |
| 1-3 errors | Auto-fix, re-validate |
| 4+ errors | Ask user: fix now or abort |
</gate>
</step>

---

<step n="5" name="Pre-commit Checks">
Fast deterministic validation before AI code review.

```bash
./scripts/pre-commit-checks.sh
```

<gate>
| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | All checks passed | Proceed |
| 1 | Blocking errors | Must fix (raw HTML, hardcoded colors, security issues) |
| 2 | Warnings only | Proceed with caution |
</gate>

**Skip with:** `--no-precheck` flag
</step>

---

<step n="5B" name="UX Review">
Check UI copy against writing style standards.

Spawn `ux-review` agent on changed `.tsx` files.

```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github diff --stat | grep -E '\.tsx'
```

<gate>
| Result | Action |
|--------|--------|
| PASS | Proceed |
| FAIL | Show violations, ask user to fix or proceed anyway |
</gate>

**Skip with:** `--no-ux` flag
</step>

---

<step n="6" name="Code Simplifier">
See [code-simplifier.md](workflows/code-simplifier.md).

**Skip with:** `--no-simplify` flag
</step>

---

<step n="7" name="Stage, Commit, Push">
```bash
# Stage all changes
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github stage .

# Review what's staged
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github status
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github diff --staged --stat
```

**Commit message format:** See [commit-message.md](templates/commit-message.md)

```bash
git commit -m "$(cat <<'EOF'
{type}: {one-line summary}

## Why
{Problem being solved}

## What
{Key changes as bullets}

{Fixes/Implements LINEAR_ISSUE_IDENTIFIER}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"

git push origin HEAD
```
</step>

</procedure>

---

## Report Template

```
Committed and pushed

**Branch:** {current_branch}
**Commit:** `{hash}`
**Files:** {count} changed
**Ticket:** {LINEAR_ISSUE_IDENTIFIER}
```

---

<guidelines name="edge-cases">
## Edge Cases

### No Changes to Commit

If `git status` shows nothing:
- Inform user: "No changes to commit"
- Don't proceed

### Want to Create PR

If user wants to create a PR after committing:
- Tell them to run `/pr`
</guidelines>

---

<references>
## Workflows

| Workflow | Step |
|----------|------|
| [ticket-gate.md](workflows/ticket-gate.md) | 2 - Ticket enforcement |
| [spec-detection.md](workflows/spec-detection.md) | 3 - Spec metadata extraction |
| [code-simplifier.md](workflows/code-simplifier.md) | 6 - Pre-staging cleanup |

## Templates

| Template | Purpose |
|----------|---------|
| [commit-message.md](templates/commit-message.md) | Commit format |

## Related Skills

| Skill | When |
|-------|------|
| `/pr` | Create PR and merge to main |
</references>
