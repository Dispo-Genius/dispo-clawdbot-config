# Bug Issue Template

Use this structure for bug issue descriptions.

---

## Template

```markdown
## Summary
{1-3 sentence description of the bug}

## Steps to Reproduce
1. {First step}
2. {Second step}
3. {Continue as needed}

## Expected Behavior
{What should happen}

## Actual Behavior
{What actually happens}

## Environment
- Browser: {if applicable}
- Device: {if applicable}
- Route: {page URL where bug occurs}

## Affected Files
{List of files likely involved, or "To be determined"}

## Acceptance Criteria
- [ ] Bug no longer occurs when following reproduction steps
- [ ] No regressions introduced
- [ ] {Additional criteria if needed}

---

## Metadata
- hasUI: {true/false}
- hasUX: false
```

---

## Example

```markdown
## Summary
Primary button doesn't show hover state in Safari 17. The button remains static when hovering, while Chrome and Firefox correctly show the darkened hover state.

## Steps to Reproduce
1. Open the app in Safari 17+
2. Navigate to any page with a primary button (e.g., /investors/prospecting)
3. Hover over the primary "Search" button
4. Observe no visual change

## Expected Behavior
Button background should darken to `var(--color-primary-hover)` on hover.

## Actual Behavior
Button remains at `var(--color-primary)` with no visual feedback.

## Environment
- Browser: Safari 17.2
- Device: macOS Sonoma 14.2
- Route: /investors/prospecting

## Affected Files
- components/ui/Button.tsx
- .claude/skills/building-ui/design-studio/actions/button/Button.tsx

## Acceptance Criteria
- [ ] Hover state works in Safari 17+
- [ ] Hover state still works in Chrome and Firefox
- [ ] No Safari-specific CSS hacks needed

---

## Metadata
- hasUI: true
- hasUX: false
```
