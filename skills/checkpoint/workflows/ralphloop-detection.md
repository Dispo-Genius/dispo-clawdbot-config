# RalphLoop Detection Workflow

Detect when remaining work is "Ralph-able" (bounded + programmatically verifiable) and generate auto-continue commands.

---

## What is Ralph-able?

Work that can be automated with a loop because it:
1. **Bounded** - Finite, countable tasks (e.g., "23 type errors")
2. **Verifiable** - Can check completion programmatically (e.g., `npm run typecheck`)
3. **Deterministic** - Same input → same output (no human judgment needed)

---

## Ralph-able Signals

| Signal | Example Pattern | Verification Command |
|--------|-----------------|---------------------|
| Type errors | "23 type errors", "fix typecheck" | `npm run typecheck` |
| Test failures | "5 tests failing", "fix tests" | `npm run test` |
| Build errors | "build failed", "fix build" | `npm run build` |
| Lint errors | "12 lint warnings", "fix lint" | `npm run lint` |

---

## NOT Ralph-able

Skip RalphLoop for:
- Design/architecture decisions
- Exploratory research or investigation
- UI/UX work requiring visual review
- Anything needing human judgment
- Ambiguous or open-ended tasks
- "Improve", "refactor", "optimize" without clear criteria

---

## Detection Patterns

Scan remaining work (todo items, conversation) for these regex patterns:

```
RALPH_PATTERNS = {
  typecheck: [
    /(\d+)\s*(type\s*)?errors?/i,
    /fix\s*type(check|script)?/i,
    /typecheck\s*fail/i
  ],
  test: [
    /(\d+)\s*tests?\s*fail/i,
    /fix\s*(failing\s*)?tests?/i,
    /test(s)?\s*fail/i
  ],
  build: [
    /build\s*fail/i,
    /fix\s*build/i,
    /production\s*build\s*error/i
  ],
  lint: [
    /(\d+)\s*lint\s*(errors?|warnings?)/i,
    /fix\s*lint/i,
    /eslint\s*errors?/i
  ]
}
```

---

## Verification Commands

Map detected patterns to verification commands:

```
VERIFY_COMMANDS = {
  typecheck: "npm run typecheck",
  test: "npm run test",
  build: "npm run build",
  lint: "npm run lint"
}
```

For multiple types, chain with `&&`:
```bash
npm run typecheck && npm run test
```

---

## Command Template

```bash
cd {project_dir} && \
MAX_ITER=10 ITER=0 && \
while [ $ITER -lt $MAX_ITER ] && ! {verify_command}; do
  claude --print "{prompt}"
  ITER=$((ITER + 1))
done && echo "✓ Done!" || echo "⚠ Max iterations reached"
```

### Template Variables

| Variable | Source |
|----------|--------|
| `{project_dir}` | Current working directory |
| `{verify_command}` | From VERIFY_COMMANDS mapping |
| `{prompt}` | Short instruction, e.g., "Fix remaining type errors" |

---

## Detection Algorithm

```
FUNCTION detect_ralphloop(remaining_work):
  detected_types = []

  FOR each item in remaining_work:
    FOR type, patterns in RALPH_PATTERNS:
      IF any pattern matches item:
        detected_types.append(type)
        BREAK

  IF detected_types is empty:
    RETURN null  # Not Ralph-able

  # Build verification command
  verify_commands = [VERIFY_COMMANDS[t] for t in unique(detected_types)]
  verify_command = " && ".join(verify_commands)

  # Build prompt
  prompt = generate_prompt(detected_types)

  RETURN {
    types: detected_types,
    verify_command: verify_command,
    prompt: prompt,
    max_iterations: 10
  }
```

---

## Prompt Generation

Keep prompts short and specific:

| Type | Prompt |
|------|--------|
| typecheck | "Fix remaining type errors" |
| test | "Fix failing tests" |
| build | "Fix build errors" |
| lint | "Fix lint errors" |
| multiple | "Fix remaining type errors and test failures" |

---

## Output Format

Added to handoff prompt after "Blockers / Watch Out":

```markdown
## Auto-Continue (RalphLoop)

Remaining work is bounded with programmatic verification.
Run in a separate terminal:

\`\`\`bash
cd /path/to/project && \
MAX_ITER=10 ITER=0 && \
while [ $ITER -lt $MAX_ITER ] && ! npm run typecheck; do
  claude --print "Fix remaining type errors"
  ITER=$((ITER + 1))
done && echo "✓ Done!" || echo "⚠ Max iterations reached"
\`\`\`

**Stop condition:** `npm run typecheck` returns success
**Safety:** Max 10 iterations
```

---

## Safety Considerations

1. **Max iterations** - Default 10, prevents infinite loops
2. **Non-interactive** - Uses `claude --print` for automation
3. **Explicit verification** - Loop only continues if verification fails
4. **User control** - Command is displayed, not auto-executed

---

## Integration

RalphLoop detection runs as Step 6.3, between handoff generation and file write:

```
Step 6: Generate Handoff Prompt
Step 6.3: Detect RalphLoop (if applicable, append to handoff)
Step 6.5: Write Handoff File
```
