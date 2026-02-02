# Question Bank

Comprehensive questions organized by category. Use 4-5 questions per round, adapting to feature complexity.

---

## Problem Space

**Purpose:** Understand what is broken, missing, or suboptimal.

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What specific problem does this solve for the user? | Ensures we're solving a real problem |
| 2 | What happens today without this? (current workaround) | Clarifies the pain point |
| 3 | Where in the app does this problem occur? | Narrows scope, identifies files |
| 4 | Who experiences this problem? (user role) | Ensures right audience |
| 5 | When does this problem manifest? (trigger) | Defines activation scenarios |
| 6 | How often does this occur? | Helps prioritize |
| 7 | What's the cost of NOT solving this? | Justifies the work |
| 8 | Is there an existing partial solution? | Identifies patterns to follow |

### AskUserQuestion Format

**ALWAYS include a recommended option.** Base recommendation on exploration findings or general patterns.

```
Question: "What specific problem does this solve for the user?"
Header: "Problem"
Options:
- label: "Missing functionality (Recommended)"
  description: "Users can't do something they need to do - most common for new features"
- label: "Broken functionality"
  description: "Something exists but doesn't work correctly"
- label: "Poor UX"
  description: "Functionality exists but is hard to use"
- label: "Performance issue"
  description: "Functionality is too slow or resource-intensive"
```

```
Question: "Where in the app does this problem occur?"
Header: "Location"
Options:
- label: "Deals area"
  description: "Board, calendar, messages, or deal detail"
- label: "Investors area"
  description: "Prospecting, vetted, or follow-up"
- label: "Navigation"
  description: "Sidebar, topbar, or global elements"
- label: "Other area"
  description: "I'll specify the exact location"
```

---

## Solution Space

**Purpose:** Define the exact solution without ambiguity.

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What is the single-sentence description? | Forces clarity |
| 2 | What is the entry point? (how user gets here) | Defines trigger |
| 3 | What is the exit point? (how user leaves) | Defines completion |
| 4 | What data does this need to function? | Identifies dependencies |
| 5 | What data does this produce or modify? | Identifies side effects |
| 6 | What are the technical constraints? | Non-functional requirements |

### AskUserQuestion Format

```
Question: "What is the entry point for this feature?"
Header: "Entry"
Options:
- label: "Button click"
  description: "User clicks a specific button/link"
- label: "Navigation item"
  description: "New item in sidebar or menu"
- label: "Keyboard shortcut"
  description: "User presses a key combination"
- label: "Automatic trigger"
  description: "System initiates based on condition"
```

```
Question: "What layout pattern should this use?"
Header: "Layout"
Options:
- label: "Modal (Recommended)"
  description: "Overlay dialog - matches most existing patterns in the app"
- label: "Full page"
  description: "Dedicated route, replaces current view"
- label: "Panel (slide-in)"
  description: "Side panel from right edge"
- label: "Inline"
  description: "Expands within current view"
```

**Note:** Recommendation should be based on codebase exploration. If existing similar features use a different pattern, recommend that instead.

---

## Interaction Direction

**Purpose:** Eliminate ambiguity about who does what in multi-step flows.

### Why This Matters

Phrases like "user enters the code" are ambiguous:
- Does user TYPE code into our UI?
- Does user SPEAK code into a phone call?
- Does SYSTEM display code for user to read?

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | For [action X], who provides the data? (System or User) | Clarifies source |
| 2 | For [action X], who receives the data? (System or User) | Clarifies destination |
| 3 | What verb describes the action? (DISPLAYS, TYPES, SPEAKS, CLICKS) | Forces precision |
| 4 | Where does this happen? (screen, phone call, email) | Clarifies medium |

### Interaction Script Format

For any multi-step flow, require a table:

| Step | Actor | Action (VERB) | Target | UI Change |
|------|-------|---------------|--------|-----------|
| 1 | User | CLICKS | "Submit" button | Modal opens |
| 2 | System | DISPLAYS | loading spinner | Button disabled |
| 3 | System | SENDS | verification call | - |
| 4 | System | SPEAKS | 6-digit code | User hears on phone |
| 5 | User | TYPES | code into boxes | Each box fills |
| 6 | System | VALIDATES | entered code | Success/error state |

### AskUserQuestion Format

```
Question: "For the verification step, who provides the code and who receives it?"
Header: "Flow"
Options:
- label: "System displays → User speaks"
  description: "System shows code on screen, user reads it aloud into phone"
- label: "System speaks → User types"
  description: "System reads code aloud on call, user types into UI"
- label: "User generates → System validates"
  description: "User creates code, system checks it"
- label: "Other flow"
  description: "I'll describe the exact interaction"
```

---

## UI/UX Questions

**Purpose:** Define exactly what the user sees and interacts with.

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What layout pattern? (modal, page, panel, inline) | Determines structure |
| 2 | What are the primary actions? (button labels) | Defines action hierarchy |
| 3 | What are secondary actions? (cancel, skip) | Ensures escape hatches |
| 4 | What form fields are required vs optional? | Prevents scope creep |
| 5 | What is the visual hierarchy? | Guides layout |
| 6 | What feedback does user receive? | Ensures states handled |
| 7 | Is there progressive disclosure? | Reduces cognitive load |
| 8 | What existing component does this resemble? | Provides pattern |

### Modal-Specific Questions (if layout = modal)

| # | Question | Why It Matters |
|---|----------|----------------|
| 9 | Structured (title+footer) or custom layout? | Determines Modal mode |
| 10 | What appears in header? (title, icon, close X?) | Header structure |
| 11 | What appears in footer? (primary btn, secondary btn, cancel?) | Footer structure |
| 12 | How can user close? (X button, backdrop, ESC, action button?) | Exit paths |
| 13 | Does footer have divider line? | Visual separation |

### AskUserQuestion Format

```
Question: "What are the primary actions for this feature?"
Header: "Actions"
Options:
- label: "Single primary action"
  description: "One main button (e.g., 'Save', 'Add')"
- label: "Two actions"
  description: "Primary + secondary (e.g., 'Save' + 'Cancel')"
- label: "Multiple actions"
  description: "Several buttons with different purposes"
- label: "No explicit actions"
  description: "Changes auto-save or apply immediately"
```

```
Question: "What feedback does the user receive after the primary action?"
Header: "Feedback"
Options:
- label: "Immediate visual change"
  description: "UI updates instantly (optimistic)"
- label: "Loading then change"
  description: "Spinner/skeleton, then result"
- label: "Toast notification"
  description: "Brief message confirming success"
- label: "Modal closes"
  description: "Return to previous context"
```

---

## Technical Questions

**Purpose:** Identify implementation details affecting architecture.

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | Where does this component live? (file path) | Defines location |
| 2 | What design system components are used? | Ensures consistency |
| 3 | What hooks or context does this need? | Identifies dependencies |
| 4 | Does this need URL state? | Affects routing |
| 5 | Does this need persistent state? | Identifies data layer |
| 6 | What TypeScript interfaces are needed? | Enables type-first dev |

### AskUserQuestion Format

```
Question: "How should state be managed for this feature?"
Header: "State"
Options:
- label: "Local component state"
  description: "useState/useReducer within component"
- label: "URL state"
  description: "Query params or route params"
- label: "Context"
  description: "React context for shared state"
- label: "External state"
  description: "Redux, API cache, or localStorage"
```

```
Question: "Does this feature require new API endpoints?"
Header: "Backend"
Options:
- label: "No backend changes"
  description: "Uses existing APIs or is frontend-only"
- label: "New endpoint"
  description: "Need to create a new API route"
- label: "Modify endpoint"
  description: "Change existing API response/behavior"
- label: "Unknown"
  description: "Need to investigate what exists"
```

---

## Edge Cases

**Purpose:** Exhaustively enumerate what can go wrong.

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What if there's no data? (empty state) | Prevents blank screens |
| 2 | What if data is loading? | Prevents jarring transitions |
| 3 | What if an API call fails? | Ensures graceful degradation |
| 4 | What if user has no permission? | Handles access control |
| 5 | What if input is invalid? | Prevents bad data |
| 6 | What if user abandons mid-flow? | Handles cleanup |
| 7 | What if user double-clicks? | Prevents duplicates |

### Standard Categories to Always Check

1. **Data states:** Empty, loading, error, partial
2. **Permission states:** Unauthorized, read-only, admin-only
3. **Input states:** Invalid, too long, special chars, empty required
4. **Timing states:** Slow network, timeout, double-click, concurrent
5. **Device states:** Mobile viewport, touch vs mouse, zoom

### AskUserQuestion Format

```
Question: "What should happen when there's no data to display?"
Header: "Empty State"
Options:
- label: "Illustration + message"
  description: "Friendly empty state with explanation"
- label: "CTA to add first item"
  description: "Prompt user to create content"
- label: "Hide the section entirely"
  description: "Only show when there's data"
- label: "Show placeholder rows"
  description: "Skeleton-like placeholder content"
```

```
Question: "What should happen when an API call fails?"
Header: "Error"
Options:
- label: "Toast with retry"
  description: "Brief error message, option to retry"
- label: "Inline error"
  description: "Error shown in place of content"
- label: "Modal error"
  description: "Blocking error dialog"
- label: "Silent retry"
  description: "Automatically retry without user action"
```

---

## Success Criteria

**Purpose:** Define measurable, testable outcomes.

### Core Questions

| # | Question | Why It Matters |
|---|----------|----------------|
| 1 | What does "done" look like? | Enables verification |
| 2 | How do we know it works? (test steps) | Provides test script |
| 3 | What should NOT happen? | Catches regressions |
| 4 | What metrics improve? (if applicable) | Ties to business value |
| 5 | What existing tests need updating? | Prevents breakage |

### Format for Success Criteria

Each criterion must be:
- **Observable:** Can be seen or measured
- **Specific:** No ambiguous terms
- **Testable:** A human can verify pass/fail

**Good examples:**
- "User can add a deal without leaving the board"
- "New deal appears in first column within 500ms"
- "Form shows inline error when address is empty"

**Bad examples:**
- "Works correctly" (what does "correctly" mean?)
- "Is fast" (how fast?)
- "Looks good" (according to whom?)

### AskUserQuestion Format

```
Question: "What is the single most important thing that must work?"
Header: "Must Work"
Options:
- label: "Core action completes"
  description: "The main action succeeds end-to-end"
- label: "Data persists correctly"
  description: "Changes are saved and retrievable"
- label: "UI updates immediately"
  description: "User sees instant feedback"
- label: "Multiple criteria"
  description: "I'll list several requirements"
```

---

## Question Flow Example

### Round 1: Problem Space (4 questions)
1. What specific problem does this solve?
2. Where in the app does this problem occur?
3. What happens today without this feature?
4. Is this a new feature or enhancement to existing?

### Round 2: Solution Space (4 questions)
1. What is the single-sentence description?
2. What is the entry point?
3. What layout pattern should this use?
4. What are the primary actions?

### Round 3: UI/UX Deep Dive (4 questions)
1. What form fields are needed?
2. What feedback does user receive?
3. What existing component does this resemble?
4. Are there any visual references or mockups?

### Round 4: Edge Cases (5 questions)
1. What if there's no data?
2. What if the API call fails?
3. What if input is invalid?
4. What if user abandons mid-flow?
5. What if user double-clicks?

### Round 5: Success Criteria (3-4 questions)
1. What does "done" look like?
2. What should NOT happen?
3. What's the simplest test that proves this works?

---

## Adapting to Complexity

### Simple Features (10-15 questions total)
- Skip technical architecture questions
- Minimal edge case exploration
- 2-3 rounds of questions

### Medium Features (15-25 questions total)
- Full question flow
- Standard edge case categories
- 4-5 rounds of questions

### Complex Features (25-40 questions total)
- Deep dive into each category
- Custom edge case exploration
- Multiple integration questions
- 5-6+ rounds of questions