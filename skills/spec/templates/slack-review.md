# Slack Spec Review Format

Templates for posting specs to Slack DM for review.

## Initial DM Message

Short summary to get attention:

```
:clipboard: Spec ready for review: *{title}*
```

## Thread Reply (Full Spec)

Post as reply to create a thread with the full spec:

```
*Problem*
{problem statement - 1-2 sentences}

*Goal*
{single sentence goal}

*Acceptance Criteria*
{numbered list}
1. {criterion 1}
2. {criterion 2}
...

*Files to Modify*
{bullet list of files}
- `{file1}`
- `{file2}`

*Phases* (if multi-phase)
{phase breakdown}
- Phase 1: {name} ({file count} files)
- Phase 2: {name} ({file count} files)
```

## Usage in Workflow

1. Detect current user via `whoami` or git config
2. Lookup Slack handle from `~/.claude/config/users.json`
3. Send initial DM with short summary
4. Reply in thread with full spec using format above
5. Tell user in Claude chat: "Spec posted to Slack DM. Reply here when ready to proceed."
6. Wait for user response in chat to approve/request changes

## Example

**Initial DM:**
```
:clipboard: Spec ready for review: *Add dark mode toggle*
```

**Thread reply:**
```
*Problem*
Users cannot switch to dark mode, causing eye strain in low-light environments.

*Goal*
Add a toggle in settings that switches the app between light and dark themes.

*Acceptance Criteria*
1. Toggle appears in Settings > Appearance
2. Theme persists across sessions (localStorage)
3. System preference detection on first visit
4. `npm run typecheck` passes
5. `npm run build` passes

*Files to Modify*
- `src/components/Settings/AppearanceTab.tsx`
- `src/hooks/useTheme.ts`
- `src/styles/theme.ts`
- `tailwind.config.ts`

*Phases*
- Phase 1: Theme infrastructure (2 files)
- Phase 2: UI toggle + persistence (2 files)
```
