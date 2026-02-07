# Spec: Native Plan File Handoff

## Problem

Current checkpoint flow requires manual copy-paste:
1. `/checkpoint` outputs markdown block
2. User copies the handoff prompt
3. User runs `/clear` or starts new chat
4. User pastes the prompt

This is friction. Claude Code has a native feature: after plan mode, it offers "Clear context and start new chat?" which loads the plan file automatically.

## Solution

Write the handoff prompt directly to the plan file. User clicks "Yes, clear context" → new chat starts with context loaded.

### New Flow

```
User: /checkpoint
Claude: [runs checkpoint workflow]
        [writes handoff to plan file]

        ✓ Checkpoint saved to Linear
        ✓ Handoff ready in plan file

        Click "Clear context and start new chat" to continue →

[Claude Code UI shows: "Clear context and start new chat?"]
User: [clicks Yes]
[New chat starts with plan file loaded as context]
```

## Changes to SKILL.md

### Step 6: Generate Handoff Prompt → Write to Plan File

**Before:**
```markdown
Output this directly to the user with:
## Handoff Prompt
Copy this to a new Claude Code chat:
```{handoff_prompt_content}```
```

**After:**
```markdown
Write the handoff prompt directly to the plan file:

1. Get plan file path from system context (same as Step 7)
2. Write handoff content to plan file using Write tool
3. Output confirmation:

✓ Checkpoint saved to Linear
✓ Handoff written to plan file

Click "Clear context and start new chat" to continue in a fresh session.
```

### Step 6.5: Write Handoff File → Remove or Deprecate

**Before:** Writes to `/tmp/claude-handoff.md` for `ce` script

**After:** No longer needed - plan file serves this purpose. The `ce` script can be updated to read from plan file path instead, or deprecated entirely since native flow is simpler.

### Step 7: Clear Plan File → Skip

**Before:** Clears plan file with minimal template

**After:** Skip this step - the handoff content IS the plan for the next session. Don't overwrite it.

### Step 8: No Change

Context threshold reset still happens.

## Template Compatibility

The handoff-prompt.md template already produces valid markdown that works as a plan file:

```markdown
# Continuing: {TICKET} - {Brief Title}

**Your task:** {one-line action statement}

You are continuing a previous session. First, gather context:

## 1. Fetch Context
...
```

This format is compatible with plan mode - the new session will see this as its active plan.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User has uncommitted plan file changes | Warn before overwriting, offer `--preserve-plan` flag |
| User wants to stay in same session | Add `--no-clear` behavior note (handoff still saved, user can clear manually) |
| Plan file doesn't exist | Create it - same as current behavior |
| Linear API fails | Still write plan file, just skip Linear posting |

## Implementation

### Files to Modify

1. **`.claude/skills/checkpoint/SKILL.md`**
   - Step 6: Change from "output to user" to "write to plan file"
   - Step 6.5: Remove or mark deprecated
   - Step 7: Change to conditional (only clear if `--clear-plan` flag)

2. **`.claude/skills/checkpoint/templates/handoff-prompt.md`**
   - No changes needed - template already produces plan-compatible format

### New Behavior Summary

| Flag | Behavior |
|------|----------|
| (default) | Write handoff to plan file, prompt user to clear context |
| `--no-commit` | Skip commit prompt |
| `--preserve-plan` | Don't overwrite existing plan file content |

## Verification

1. Run `/checkpoint PRO-XXX`
2. Verify plan file contains handoff content
3. Click "Clear context and start new chat"
4. Verify new session:
   - Sees plan file as active plan
   - Can execute the numbered steps (fetch context, explore, etc.)
   - Proceeds without asking "what should I do?"

## Migration

- Keep `/tmp/claude-handoff.md` writing for backwards compatibility with `ce` script
- Add deprecation note in output: "Note: `ce` script still works, but native clear is recommended"
- Remove `ce` dependency after team adoption
