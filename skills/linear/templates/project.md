# Project Template

Use this structure for Linear project descriptions.

---

## Template

```markdown
## Summary
{Concise summary, max 255 characters - this appears in project lists}

## Goals
{What this project aims to achieve}

- {Goal 1}
- {Goal 2}
- {Goal 3}

## Milestones

### Phase 1: {Name}
- [ ] {Deliverable}
- [ ] {Deliverable}

### Phase 2: {Name}
- [ ] {Deliverable}
- [ ] {Deliverable}

## Success Criteria
{How we know the project is complete}

- {Criterion 1}
- {Criterion 2}

## Out of Scope
{What this project explicitly does NOT include}

- {Item 1}
- {Item 2}
```

---

## Example

```markdown
## Summary
Migrate all UI components to the design system with CSS variables, eliminating Tailwind color classes and ensuring design consistency.

## Goals
- Eliminate all hardcoded colors from components
- Ensure all spacing follows 3-point grid
- Create design system documentation
- Enable theming support (dark mode ready)

## Milestones

### Phase 1: Core Components
- [ ] Button variants migrated
- [ ] Input components migrated
- [ ] Modal and overlay components migrated

### Phase 2: Feature Components
- [ ] Navigation components migrated
- [ ] Card and list components migrated
- [ ] Form components migrated

### Phase 3: Documentation
- [ ] Design Studio previews for all components
- [ ] Token documentation complete
- [ ] Migration guide for future components

## Success Criteria
- Zero `bg-{color}` or `text-{color}` Tailwind classes in components
- All components use `var(--color-*)` tokens
- Design Studio has preview for every component
- Dark mode toggle works across all pages

## Out of Scope
- Third-party component libraries
- Marketing pages (separate design system)
- Legacy prototype pages scheduled for deletion
```

---

## Notes

- **Summary** is limited to 255 characters and appears in project lists
- **Description** (the full markdown) appears on the project detail page
- **Target date** is set separately via the `targetDate` parameter
