# Improvement Issue Template

Use this structure for improvement/enhancement issue descriptions.

---

## Template

```markdown
## Summary
{1-3 sentence description of the improvement}

## Current State
{How it works today, what's suboptimal}

## Proposed Change
{What the improvement will do, how it's better}

## Affected Files
{List of files to be modified}

## Acceptance Criteria
- [ ] {Specific, testable criterion}
- [ ] {Another criterion}
- [ ] Existing functionality unchanged (no regressions)

---

## Metadata
- hasUI: {true/false}
- hasUX: {true/false}
```

---

## Example

```markdown
## Summary
Improve button hover states with smoother transitions and more noticeable visual feedback for better accessibility.

## Current State
Buttons have instant color change on hover with no transition. The color shift is subtle (only 5% darker), making it hard for some users to notice interaction feedback.

## Proposed Change
- Add 150ms ease-out transition to hover state
- Increase hover darkness from 5% to 10%
- Add subtle scale transform (1.02x) for primary buttons
- Ensure focus states match hover for keyboard navigation

## Affected Files
- .claude/skills/building-ui/design-studio/actions/button/Button.tsx
- .claude/skills/building-ui/tokens/effects.md

## Acceptance Criteria
- [ ] All button variants have smooth hover transitions
- [ ] Hover state is clearly visible (WCAG 2.1 AA)
- [ ] Focus state matches hover state
- [ ] Scale transform doesn't cause layout shift
- [ ] Existing button functionality unchanged

---

## Metadata
- hasUI: true
- hasUX: false
```
