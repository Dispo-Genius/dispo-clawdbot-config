# Feature Issue Template

Use this structure for feature issue descriptions.

---

## Template

```markdown
## Summary
{1-3 sentence description of the feature}

## User Story
As a {user type}, I want {goal/desire} so that {benefit/value}.

## Scope

### In Scope
- {What this feature includes}
- {Specific functionality}

### Out of Scope
- {What this feature does NOT include}
- {Future considerations}

## Linked Files
{Existing files this feature will modify or extend}

## Acceptance Criteria
- [ ] {Specific, testable criterion}
- [ ] {Another criterion}
- [ ] {Continue as needed}

---

## Metadata
- hasUI: {true/false}
- hasUX: {true/false}
```

---

## Example

```markdown
## Summary
Add dark mode support with system preference detection and manual toggle in settings. Users can choose between light, dark, or system-based theming.

## User Story
As a user, I want dark mode so that I can use the app comfortably at night without eye strain.

## Scope

### In Scope
- Dark mode color tokens in design system
- System preference detection via `prefers-color-scheme`
- Manual toggle in Settings page
- Persistence of user preference in localStorage
- Smooth transition animation between modes

### Out of Scope
- Per-page theme overrides
- Custom accent colors
- Scheduled auto-switching (sunset/sunrise)

## Linked Files
- .claude/skills/building-ui/tokens/colors.md
- components/settings/SettingsPage.tsx
- app/layout.tsx
- styles/globals.css

## Acceptance Criteria
- [ ] Dark mode applies to all pages consistently
- [ ] System preference is detected on first visit
- [ ] Toggle persists across sessions
- [ ] Transition between modes is smooth (300ms)
- [ ] No flash of wrong theme on page load

---

## Metadata
- hasUI: true
- hasUX: true
```
