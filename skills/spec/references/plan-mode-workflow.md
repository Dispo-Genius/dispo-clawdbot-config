# Plan Mode Workflow for Specs

Mandatory workflow for all spec creation and refinement.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAN MODE REQUIRED                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. /manage-spec (interview in main context)                │
│     - Gather intent                                         │
│     - Run 5 interview rounds                                │
│     - Draft spec content                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. User approves spec content                              │
│     - Review via Slack DM or in-chat                        │
│     - "approve" / "edit" / "cancel"                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. spec-writer agent writes to .claude/specs/              │
│     - Task({ subagent_type: "spec-writer" })                │
│     - Reads existing if present, uses Edit to append        │
│     - Returns: "Spec written to {path}..."                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. /checkpoint auto-triggered                              │
│     - Creates session log entry                             │
│     - Updates Linear ticket                                 │
│     - Generates handoff prompt                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Handoff to plan file → ExitPlanMode                     │
│     - Plan file contains ONLY handoff prompt                │
│     - Spec content in .claude/specs/{slug}.md               │
└─────────────────────────────────────────────────────────────┘
```

## Rules

### Must Do
1. **Interview in main context** - Not in a subagent
2. **Spec via spec-writer agent** - Never write specs inline
3. **Checkpoint after spec-writer** - Always invoke `/checkpoint`
4. **Plan mode required** - Never write specs outside plan mode

### Must Not Do
1. **Never write spec inline** - Always use spec-writer agent
2. **Never skip checkpoint** - Session context gets lost
3. **Never put spec content in plan file** - Plan file = handoff only

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Using Write tool directly for spec | Use Task with spec-writer agent |
| Skipping checkpoint after spec | Always invoke `/checkpoint {TICKET}` |
| Writing spec outside plan mode | Enter plan mode first: EnterPlanMode |
| Plan file contains full spec | Plan file contains handoff prompt only |
| Forgetting session log | Checkpoint handles this automatically |

## Error Recovery

### Spec written but checkpoint not triggered
1. Manually invoke `/checkpoint {TICKET}`
2. Verify session log added to spec file
3. Verify Linear ticket updated

### Spec written outside plan mode
1. The spec file is valid, keep it
2. Enter plan mode for any refinements
3. Run checkpoint to create proper handoff

### spec-writer agent failed
1. Retry the Task call
2. Do NOT proceed to checkpoint until spec confirmed written
3. Check error message - may need to resolve file permissions

### Checkpoint failed
1. Check Linear connectivity
2. Manually update spec with session log if needed
3. Generate handoff prompt manually

## Verification Checklist

After completing /spec workflow, verify:

- [ ] Spec file exists at `.claude/specs/{slug}.md`
- [ ] Spec status is `approved` (or `draft` if not yet approved)
- [ ] Session log entry present in spec file
- [ ] Linear ticket created/updated (if approved)
- [ ] Plan file contains handoff prompt (not spec content)
