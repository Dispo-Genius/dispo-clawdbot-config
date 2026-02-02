# Code Simplifier (Step 6)

**Goal:** Apply first-principles deletion before code is staged.

---

## Run Code Simplifier

```
Run /code-simplifier on changed files
```

---

## Process

### 1. Auto-apply low-risk removals:

- Unused imports (zero references)
- Dead code (after unconditional return/throw)
- Duplicate imports
- Empty conditionals
- Commented-out code blocks

### 2. Surface medium-risk suggestions:

- Console.log statements (may be intentional)
- Single-caller functions (may be API surface)
- Unused exports (may have external consumers)

### 3. User decision for suggestions:

- "Apply all" / "Review each" / "Skip"

### 4. Validate after changes:

```bash
npm run typecheck
```

- If validation fails, revert auto-applied changes
- Convert to suggestions instead

---

## Output

| Lines Removed | Action |
|---------------|--------|
| 0 | "No simplification opportunities found" |
| 1+ | "{n} lines removed, {m} suggestions available" |

---

## Skip With

`--no-simplify` flag on `/commit`
