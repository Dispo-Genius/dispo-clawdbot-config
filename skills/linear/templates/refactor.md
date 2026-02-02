# Refactor Issue Template

Use this structure for refactor issue descriptions.

---

## Template

```markdown
## Summary
{1-3 sentence description of the refactor}

## Motivation
{Why this refactor is needed - tech debt, maintainability, performance}

## Approach
{High-level approach to the refactor}

## Affected Files
{List of files to be modified}

## Acceptance Criteria
- [ ] Behavior unchanged (no functional changes)
- [ ] All existing tests pass
- [ ] {Code quality improvement - e.g., "Type safety improved"}
- [ ] {Another criterion if needed}

---

## Metadata
- hasUI: false
- hasUX: false
```

---

## Example

```markdown
## Summary
Extract API client logic from components into a dedicated service layer with proper TypeScript types and error handling.

## Motivation
Currently, API calls are scattered across components with inconsistent error handling. This makes it difficult to:
- Add global error handling (auth expiry, rate limits)
- Test components in isolation
- Maintain consistent loading/error states

## Approach
1. Create `services/api/` directory structure
2. Extract fetch calls into typed service functions
3. Add centralized error handling with typed responses
4. Update components to use new service layer
5. Add unit tests for service functions

## Affected Files
- services/api/index.ts (new)
- services/api/investors.ts (new)
- services/api/deals.ts (new)
- services/api/types.ts (new)
- components/investors/prospecting/ProspectingView.tsx
- components/deals/DealsList.tsx
- hooks/use-investors.ts
- hooks/use-deals.ts

## Acceptance Criteria
- [ ] All API calls go through service layer
- [ ] Behavior unchanged for all existing features
- [ ] All existing tests pass
- [ ] TypeScript strict mode passes
- [ ] Error handling consistent across all endpoints

---

## Metadata
- hasUI: false
- hasUX: false
```
