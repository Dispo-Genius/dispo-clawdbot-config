# Decision Extraction Workflow

Extract and preserve decisions when restructuring a spec file into folder format.

> **CRITICAL:** Decisions are institutional knowledge. They must NEVER be lost during restructuring.

---

## When to Use

- Restructuring a single-file spec into folder format
- Spec exceeds threshold (>300 lines OR >10 sessions)
- User accepts restructure prompt

---

## Extraction Process

### Step 1: Scan Session Logs for Decisions

**Decision patterns to match:**

| Pattern | Example |
|---------|---------|
| "decided to..." | "We decided to use SQLite for caching" |
| "chose X because..." | "Chose exponential backoff because of rate limits" |
| "using X because..." | "Using JWT because it's stateless" |
| "will use X" | "Will use Redis for the queue" |
| "going with X" | "Going with the simpler approach" |
| "changed from X to Y" | "Changed from polling to webhooks" |
| "switched to X" | "Switched to TypeScript for type safety" |
| "finalized on X" | "Finalized on the three-tier architecture" |

**Also check for:**
- `### Decisions` or `**Decisions:**` sections in session logs
- Bullet points starting with decision verbs
- Rationale indicators: "because", "since", "due to", "for"

### Step 2: Extract Decision Components

For each decision found, extract:

| Field | Description | Required |
|-------|-------------|----------|
| **Decision** | What was decided (concise) | Yes |
| **Rationale** | Why it was decided | Yes |
| **Session** | Session number where decided | Yes |
| **Date** | Date of that session | Yes |
| **Topic** | Category for deduplication | For deduping |

**Example extraction:**
```
Session 3 text: "Decided to use SQLite for caching because it's simpler for the prototype phase and we can migrate to Redis later if needed."

Extracted:
- Decision: Use SQLite for caching
- Rationale: Simpler for prototype, can migrate later
- Session: 3
- Date: 2025-01-24
- Topic: caching
```

### Step 3: Deduplicate Decisions

When the same topic is decided multiple times, **keep the LATEST decision**.

**Deduplication rules:**
1. Group decisions by topic/subject
2. If multiple decisions on same topic, keep the one from the highest session number
3. Mark superseded decisions for reference (optional)

**Example:**
```
Session 2: "Using in-memory cache for speed"
Session 5: "Switched to SQLite cache for persistence"

Result: Keep Session 5 decision, discard Session 2
```

### Step 4: Build Decisions Table

Format for main SPEC.md:

```markdown
## Decisions (PRESERVED - DO NOT DELETE)
<!-- Key decisions extracted from session logs. Never delete. -->

| Decision | Rationale | Session | Date |
|----------|-----------|---------|------|
| Use SQLite for cache | Simpler for prototype, can migrate later | 5 | 2025-01-25 |
| Exponential backoff for retries | Rate limits require it | 3 | 2025-01-23 |
| JWT for auth tokens | Stateless, works with load balancer | 1 | 2025-01-21 |
```

### Step 5: User Confirmation (REQUIRED)

Before finalizing restructure, present decisions to user:

```
AskUserQuestion:
  "I extracted these decisions from your session logs. Please confirm they're complete:"

  [Show decisions table]

  Options:
    - Looks complete (Recommended)
    - Let me add more
    - Show me what I might be missing
```

**If "Show me what I might be missing":**
- List any text that matched decision patterns but wasn't included
- Let user choose which to add

---

## Integration with Checkpoint

The decision extraction happens during the restructure flow:

```
1. User accepts restructure prompt
2. → Run decision extraction (this workflow)
3. Create folder structure
4. Move session logs to sessions/
5. Create SPEC.md with extracted decisions
6. User confirms decisions are complete
7. Continue with checkpoint
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| No decisions found | Warn user: "No explicit decisions found in session logs. You can add them manually to the Decisions section." |
| Extraction fails | Fall back to empty Decisions section with comment: "<!-- Add key decisions here -->" |
| User wants to add more | Provide format example and let them edit SPEC.md directly |

---

## Patterns to Avoid

**False positives to filter out:**
- "I decided to check the logs" (task, not architecture decision)
- "Let's go with option 1" (without rationale = maybe not a key decision)
- "Using the Read tool" (tool usage, not project decision)

**Key indicator of real decision:**
- Has lasting impact on architecture/approach
- Includes rationale
- Would be confusing if revisited later without context
