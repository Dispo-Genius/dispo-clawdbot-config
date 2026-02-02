# Spec Issue Template

Use this structure for spec issue descriptions in Linear.

---

## Simple Spec Template

For features touching ≤3 files, no new components.

```markdown
## Summary
{1-2 sentence problem statement. What is broken/missing?}

## Success Criteria
- [ ] {Observable outcome 1 - user can do X}
- [ ] {Observable outcome 2 - system responds with Y}
- [ ] {Must NOT: something that should not happen}

## User Flow

**Entry:** {How user gets here}
**Exit:** {How user leaves - success path}
**Cancel:** {How user abandons}

### Steps

1. User {action}
   - System {response}
   - UI {change}

2. User {action}
   - System {response}
   - **Done:** {final state}

## Components

| Component | @ds Path | Props/Variant | Notes |
|-----------|----------|---------------|-------|
| {Name} | `@ds/{path}` | {key props} | {context} |

## Edge Cases

| Category | Scenario | User Sees | System Does |
|----------|----------|-----------|-------------|
| Empty | No data exists | "{message}" + CTA | - |
| Loading | Initial load | Skeleton | Fetch API |
| Error | API failure | Toast: "{error}" | Log |
| Validation | Required empty | Inline: "Required" | Block submit |

## Technical Notes

**File path:** `components/{area}/{ComponentName}.tsx`
**Route (if applicable):** `/{route}`

### Dependencies
- {Hook or context needed}
- {API endpoint}

## Out of Scope
- {Feature that might be expected but NOT included}
- {Another explicit exclusion}

---
hasUI: {true|false}
hasUX: {true|false}
```

---

## Complex Spec Template (Phased)

For features with 4+ files, multiple components, significant scope.

```markdown
## Summary
{1-2 sentence problem statement}

## Overview
{1-2 paragraphs describing the feature holistically. This is the "big picture" that provides context for all phases. Any developer should read this first to understand the full scope.}

## Phases

| # | Phase | Description |
|---|-------|-------------|
| 1 | Setup & Types | Interfaces, TypeScript types, hooks |
| 2 | Core Components | Main UI components |
| 3 | {Phase Name} | {Description} |
| 4 | {Phase Name} | {Description} |
| 5 | Polish & QA | Edge cases, accessibility, final touches |

---

## Phase 1: Setup & Types

### Goal
{What this phase accomplishes - 1-2 sentences}

### Tasks
- [ ] Create TypeScript interfaces
- [ ] Set up hooks
- [ ] {Other setup tasks}

### Files
- `types/{feature}.ts`
- `hooks/use-{feature}.ts`

### Interfaces

```tsx
interface {FeatureName}Props {
  // Define props
}

interface {FeatureName}State {
  // Define state
}
```

---

## Phase 2: Core Components

### Goal
{What this phase accomplishes}

### Tasks
- [ ] Create {Component1}
- [ ] Create {Component2}
- [ ] Wire up to {parent}

### Components

| Component | @ds Path | Notes |
|-----------|----------|-------|
| {Name} | `@ds/{path}` | {context} |

### Implementation Details
{Deep context specific to this phase - UI specs, behavior, etc.}

---

## Phase 3: {Phase Name}

{Continue pattern for each phase}

---

## Success Criteria

High-level acceptance criteria for the entire feature:

- [ ] {Observable outcome 1}
- [ ] {Observable outcome 2}
- [ ] {Must NOT happen}

## Edge Cases

| Category | Scenario | User Sees | System Does |
|----------|----------|-----------|-------------|
| Empty | {scenario} | {message} | {action} |
| Error | {scenario} | {message} | {action} |
| {other} | {scenario} | {message} | {action} |

## Out of Scope
- {Explicit exclusion 1}
- {Explicit exclusion 2}

---
hasUI: {true|false}
hasUX: {true|false}
currentPhase: 1
```

---

## Component Reference

### Common @ds Components

**Action buttons:**
- `Button` - variant: primary, secondary, ghost, destructive

**Text fields:**
- `TextInput` - basic text input
- `Textarea` - multiline text
- `SearchInput` - with search icon
- `MoneyInput` - currency formatting
- `PhoneInput` - phone formatting

**Dropdowns:**
- `SingleSelectDropdown` - pick one option
- `MultiSelectDropdown` - pick multiple options

**Date/Time:**
- `DatePicker` - single date
- `DateRangePicker` - date range
- `TimeInput` - time selection

**Overlay:**
- `Modal` - dialog overlay

**Selection:**
- `Checkbox` - single checkbox
- `Toggle` - on/off switch
- `Chip` - removable tag

**Feedback:**
- `StatusBanner` - info/warning/error banner
- `Tooltip` - hover information

---

## Edge Case Categories

### Always Check

| Category | Scenarios |
|----------|-----------|
| Data states | Empty, loading, error, partial, stale |
| Permission | Unauthorized, read-only, admin-only |
| Input | Invalid, too long, special chars, empty required |
| Timing | Slow network, timeout, double-click, concurrent |
| Device | Mobile viewport, touch vs mouse, zoom, offline |

### Error Message Format

```
[What happened] + [What to do next]
```

**Examples:**
- "Couldn't save. Check your connection and try again."
- "Address is required. Please enter a property address."
- "This already exists. Would you like to view it instead?"

---

## Example: Simple Spec

```markdown
## Summary
Add call recording toggle to phone number settings. Users need to enable/disable recording per number.

## Success Criteria
- [ ] Toggle appears on each phone number row
- [ ] Toggle state persists after page refresh
- [ ] Default state is OFF (no recording)
- [ ] Visual indicator shows current recording state

## User Flow

**Entry:** User navigates to Settings > Phone Numbers
**Exit:** Toggle change auto-saves
**Cancel:** N/A (auto-save)

### Steps

1. User sees phone numbers list with recording toggle on each row
2. User clicks toggle
   - System saves preference
   - UI shows updated state
   - **Done:** Recording preference saved

## Components

| Component | @ds Path | Props/Variant | Notes |
|-----------|----------|---------------|-------|
| Toggle | `@ds/selection/Toggle` | size="sm" | Recording toggle |

## Edge Cases

| Category | Scenario | User Sees | System Does |
|----------|----------|-----------|-------------|
| Loading | Saving preference | Toggle disabled briefly | POST to API |
| Error | Save fails | Toast: "Couldn't save" | Revert toggle |

## Technical Notes

**File path:** `components/settings/phone-numbers/PhoneNumberRow.tsx`

### Dependencies
- `usePhoneNumbers` hook (update to include recording state)
- API: `PATCH /api/phone-numbers/:id`

## Out of Scope
- Recording playback UI
- Recording consent notices
- Recording storage settings

---
hasUI: true
hasUX: false
```
