# Best Practices (Advisory)

Suggestions for optimal Claude Code usage. These are not critical issues but patterns that improve outcomes.

## Verification Patterns

Help Claude verify its work by providing clear success criteria:

### Tests

```markdown
## Verification
Run `npm test` after changes. All tests must pass.
```

### Screenshots

```markdown
## Verification
Take a screenshot of the component after changes.
Use: `agent-browser screenshot /tmp/result.png`
```

### Expected Output

```markdown
## Verification
The command should output:
✓ Build successful
✓ 0 type errors
```

**Why it matters:** Claude performs better with concrete verification steps rather than vague "make sure it works" instructions.

## Context Management

### When to Use /clear

Start fresh when:
- Switching to unrelated task
- Previous context is causing confusion
- Session has accumulated stale assumptions

### When to Use /compact

Compress without losing context when:
- Mid-task but context is getting large
- Need to continue but want efficiency
- Working on long implementation

### Context Thresholds

| Remaining | Action |
|-----------|--------|
| > 70% | Continue normally |
| 40-70% | Consider /compact |
| < 40% | Use /checkpoint or /clear |

## Session Anti-Patterns

### Kitchen Sink CLAUDE.md

**Problem:** Cramming everything into CLAUDE.md

```markdown
# BAD: 500+ line CLAUDE.md with every possible instruction
```

**Fix:** Keep CLAUDE.md < 150 lines. Move details to skills/rules.

### Over-Correcting

**Problem:** Adding instructions after every mistake

```markdown
# BAD: Accumulating "don't do X" rules
NEVER use semicolons
NEVER use var
NEVER forget to add types
NEVER...
```

**Fix:** Positive instructions are clearer than prohibitions. Use "prefer X" over "never Y".

### Premature Optimization

**Problem:** Over-specifying before understanding workflows

**Fix:** Start minimal, add rules only when Claude repeatedly makes the same mistake.

## Parallel Execution Patterns

### Writer/Reviewer Pattern

For large changes, split into parallel agents:

```markdown
## Workflow
1. Spawn Writer agent: implements the feature
2. Spawn Reviewer agent: reviews for issues
3. Merge feedback and finalize
```

**Benefits:**
- Catches issues during implementation
- Different perspectives on the code
- Faster than sequential review

### Multi-File Investigation

When researching across codebase:

```markdown
## Workflow
Deploy 3 Explore agents in parallel:
- Agent 1: Search frontend/
- Agent 2: Search backend/
- Agent 3: Search shared/
```

**Benefits:**
- Faster discovery
- Isolated search contexts
- No search result pollution

## Prompting Tips

### Be Specific About Output

```markdown
# GOOD
Return a JSON object with fields: name, status, errors[]

# BAD
Return the results
```

### Include Edge Cases

```markdown
# GOOD
Handle: empty input, null values, arrays > 1000 items

# BAD
Make sure it handles errors
```

### Specify Non-Goals

```markdown
# GOOD
Do NOT refactor surrounding code. Only fix the bug.

# BAD
Fix the bug (Claude may "improve" other things)
```

## When These Apply

These are **suggestions** surfaced in the audit report. Unlike critical issues:
- They don't block functionality
- They're patterns that improve outcomes
- They're based on common usage observations

The audit will flag these as "Suggestions" rather than "Critical" or "Warning".
