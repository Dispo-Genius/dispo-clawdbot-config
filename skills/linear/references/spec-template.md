# Spec Template

Structured template for writing Linear issue specs. Follow this format for all non-trivial issues.

---

## Required Sections (Always Include)

### Problem Statement

Answer these questions:
- What is broken, missing, or suboptimal?
- Who is affected? (user role)
- What's the cost of NOT fixing this?

**Example:**
```
On smaller screens (< 768px), DealSidebar header consumes ~25% of vertical space
for buttons used once per deal lifecycle, leaving insufficient room for card content.
```

---

### User Story

Format: `As a [role], I want [goal], so that [benefit].`

**Example:**
```
As a wholesaler on a tablet, I want the header to collapse when scrolling,
so that I can see more deal cards without action buttons taking up space.
```

---

### Current State

What happens now? Include:
- Specific behavior or measurements
- Screenshots for UI issues
- Code snippets if relevant

**Example:**
```
- Header: 156px fixed (Begin marketing + Mark under contract + Segmented control)
- Available content: ~478px on 768px screen
- View listing button: z-index not set, hidden by photos
```

---

### Desired State

What should happen? Include:
- Expected behavior
- Mockups/wireframes for UI features
- Specific values (timing, sizes, etc.)

**Example:**
```
- Header slides up on scroll down (200ms ease-out)
- Header reveals on any upward scroll
- Maximum content space when scrolled
- View listing always visible (z-20)
```

---

### Solution

High-level approach (1-2 paragraphs):
- What technical approach will be used?
- Why this approach over alternatives?

**Example:**
```
Track scroll direction using onScroll event. Store lastScrollY and compare to current.
Toggle isHeaderVisible state. Apply transform: translateY(-100%) when hidden with
200ms ease-out transition. This is simpler than intersection observer and matches
iOS Safari's familiar pattern.
```

---

### Acceptance Criteria

Checklist format. Each item must be:
- **Observable:** Can be seen or measured
- **Specific:** No ambiguous terms
- **Testable:** Human can verify pass/fail

**Example:**
```
- [ ] Scrolling down hides header with 200ms animation
- [ ] Scrolling up (any amount) reveals header
- [ ] View listing button visible above all cards
- [ ] No layout shift when header toggles
- [ ] Works on all viewport sizes
```

**Important:** When implementing, convert these to tasks via TaskCreate for tracking.

---

## Conditional Sections (Include When Applicable)

### Edge Cases

For features with multiple states or complex interactions.

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty data | Show empty state illustration |
| Error state | Display error message with retry |
| Loading state | Show skeleton/spinner |
| At boundary | Specific behavior at limits |

**Example:**
```
| Scenario | Behavior |
|----------|----------|
| At top of list | Header visible, no animation |
| Rapid scroll direction change | Debounce to prevent jitter (50ms) |
| Content shorter than viewport | Header stays visible (no scroll) |
```

---

### Files to Modify

For implementation-ready specs. List files and what changes.

**Example:**
```
- `components/deals/sidebar/DealSidebar.tsx`
  - Add scroll direction tracking state
  - Add header visibility toggle
  - Apply transform animation to header div
  - Add z-20 to floating button container
```

---

### Alternatives Considered

For architectural decisions. Document what was evaluated.

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Option A | Fast, simple | Limited flexibility | ✓ Chosen |
| Option B | More flexible | Complex, slower | Rejected: over-engineered |

---

### Interaction Flow

For multi-step features. Use Actor-Action-Result format.

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | User | Scrolls down | Header slides up |
| 2 | System | Detects direction change | Updates state |
| 3 | User | Scrolls up | Header reveals |

---

### Testing Plan

For complex features requiring verification steps.

**Manual Testing:**
1. Open deal detail on tablet viewport (768px)
2. Scroll down past first card
3. Verify header is hidden
4. Scroll up slightly
5. Verify header reveals

**Automated Tests:**
- Unit test for scroll direction detection
- E2E test for header visibility toggle

---

### Dependencies

For issues with blockers or relationships.

| Type | Issue/Item | Status |
|------|------------|--------|
| Blocks | DIS-XXX | In progress |
| Blocked by | DIS-YYY | Todo |
| Related | DIS-ZZZ | Done |
| External | Design review | Pending |

---

## Anti-Patterns (What NOT to Write)

| Bad | Why | Good |
|-----|-----|------|
| "Fix the bug" | No context | "Fix z-index: View listing button hidden behind MediaCard photos" |
| "Make it faster" | Not measurable | "Reduce initial load to <500ms" |
| "Works correctly" | Ambiguous | "User can submit form and sees success toast within 200ms" |
| "Should look good" | Subjective | "Uses design system Card component with 12px padding" |
| "Update the UI" | Too vague | "Replace raw button with Button component, add hover state" |
| "Handle edge cases" | Not specific | "Show empty state when investor list is empty" |

---

## Quick Reference

### Minimum Viable Spec (for simpler issues)

```markdown
## Problem
[1-2 sentences: what's wrong and who's affected]

## User Story
As a [role], I want [goal], so that [benefit].

## Solution
[1 paragraph: how we'll fix it]

## Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]
```

### Full Spec (for complex features)

```markdown
## Problem
[Detailed problem with measurements/data]

## User Story
As a [role], I want [goal], so that [benefit].

## Current State
[What happens now with screenshots]

## Desired State
[What should happen with mockups]

## Solution
[Technical approach and rationale]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
...

## Edge Cases
| Scenario | Behavior |
|----------|----------|
...

## Files to Modify
- `path/file.tsx` - changes

## Testing Plan
1. Step 1
2. Step 2
...

## Dependencies
| Type | Issue | Status |
|------|-------|--------|
...
```