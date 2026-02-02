# Commit Message Format

**Pattern:** Why → What → How

---

## Template

```bash
git commit -m "$(cat <<'EOF'
{type}: {one-line summary}

## Why
{Problem being solved, user need, motivation - 1-2 sentences}

## What
{List of key changes as bullets}

## How (optional, for complex changes)
{Approach taken, key decisions, why this solution over alternatives}

{If LINEAR_ISSUE_ID: "Fixes {LINEAR_ISSUE_ID}" or "Implements {LINEAR_ISSUE_ID}"}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Guidance

- **Why** makes release notes meaningful - always include it
- **What** should be scannable bullets, not paragraphs
- **How** is optional - include for non-obvious architectural decisions
- Skip "How" for simple fixes where the approach is self-evident
- Include Linear issue reference if available (links commit to issue)

---

## Type Prefixes

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `improve` | Enhancement to existing feature |
| `refactor` | Code restructure without behavior change |
| `chore` | Maintenance, deps, config |
| `docs` | Documentation only |
| `test` | Tests only |

---

## Example

```
feat: Add investor card selection state

## Why
Users couldn't tell which investor card was selected in the list,
causing confusion during bulk operations.

## What
- Add selected state styling to InvestorCard
- Implement selection tracking in parent component
- Add shift-click for range selection

Implements FE-42

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
