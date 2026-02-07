# Ticket Detection Workflow

How to detect which Linear ticket(s) to checkpoint to.

---

## Detection Priority

```
1. User-specified argument
   └── IF /checkpoint DIS-XXX → use DIS-XXX

2. Explicit conversation mention
   └── SCAN conversation for "working on DIS-XXX", "for DIS-XXX", "ticket DIS-XXX"
   └── IF found → use most recent mention

3. Branch name pattern
   └── RUN: git branch --show-current
   └── MATCH: */dis-{N}-* or *-dis-{N}-* or dis-{N}/*
   └── IF found → use DIS-{N}

4. Plan file reference
   └── READ plan file header for "Linear: DIS-XXX"
   └── IF found → use DIS-XXX

5. Recent conversation DIS-XXX mentions
   └── SCAN all conversation for DIS-XXX pattern
   └── IF single ticket → use it
   └── IF multiple tickets → ask user to choose

6. Search Linear by conversation keywords
   └── EXTRACT keywords from conversation (user's ask, file paths, feature names)
   └── RUN: linear-cc search-issues --query "{keywords}" --limit 5
   └── IF matches → present as options via AskUserQuestion
   └── Include "None of these" option

7. Fallback: Ask user
   └── USE AskUserQuestion with recent tickets as options
```

---

## Implementation

### Step 1: Check User Argument

```
IF args contains DIS-XXX pattern:
  RETURN [DIS-XXX]
```

### Step 2: Check Conversation for Explicit Mention

```
PATTERNS = [
  "working on (DIS-\d+)",
  "for (DIS-\d+)",
  "ticket (DIS-\d+)",
  "(DIS-\d+) ticket",
  "on (DIS-\d+)"
]

FOR each user message in conversation:
  FOR each pattern:
    IF match → ADD to candidates with priority = HIGH
```

### Step 3: Check Branch Name

```bash
BRANCH=$(git branch --show-current 2>/dev/null)

# Match patterns:
# feature/dis-322-description
# bugfix/dis-123-fix
# dis-456/some-work

IF BRANCH matches */dis-(\d+)-* OR dis-(\d+)/*:
  ADD DIS-{N} to candidates with priority = MEDIUM
```

### Step 4: Check Plan File

```
READ plan file (from system context)
MATCH header for "Linear: DIS-XXX" or "> Linear: DIS-XXX"

IF found:
  ADD DIS-XXX to candidates with priority = MEDIUM
```

### Step 5: Scan All Conversation

```
FOR each message in conversation:
  FIND all DIS-\d+ patterns
  FOR each match:
    ADD to candidates with priority = LOW
    TRACK frequency
```

### Step 6: Resolve Candidates

```
IF candidates is empty:
  → Continue to Step 7 (Linear search)

IF single candidate:
  → RETURN [candidate]

IF multiple candidates:
  IF one has HIGH priority:
    → RETURN [high priority candidate]
  ELSE:
    → Ask user to choose from top 3 by frequency
```

---

### Step 7: Search Linear via linear-manager Agent

When no tickets found via local detection:

**1. EXTRACT search context:**
- User's original ask (key nouns/verbs)
- File paths mentioned (strip paths, use feature names)
- Error messages or technical terms
- Component/feature names

**2. SPAWN linear-manager agent:**
```
Task tool:
  subagent_type: linear-manager
  prompt: |
    Find Linear tickets related to this work:

    Context: {extracted_keywords}

    Search strategy (in order):
    1. List my "In Progress" tickets - check if any match context
    2. List my assigned tickets - check if any match context
    3. Keyword search with context terms
    4. Synonym expansion search

    Return matching tickets with relevance reasoning.
    Format each match as: {identifier}: {title}
```

**3. PARSE agent response:**
- If agent returns tickets → Present as options via AskUserQuestion
- If agent returns "NOT FOUND" or no matches → Fall through to Step 8 (manual input)

**4. FORMAT options:**
```
AskUserQuestion:
  question: "Found potential tickets. Which one?"
  header: "Ticket"
  options:
    - label: "DIS-XXX: {title}"
      description: "{relevance reasoning from agent}"
    - label: "DIS-YYY: {title}"
      description: "{relevance reasoning from agent}"
    - label: "None of these"
      description: "I'll specify the ticket manually"
```

**Example:**
```
Extracted context: "checkpoint", "ticket detection", "Linear search"

Agent search results:
- DIS-428: Improve checkpoint ticket detection (In Progress, matches "checkpoint" and "ticket")
- DIS-401: Linear integration improvements (Assigned, matches "Linear")

AskUserQuestion:
  "Found potential tickets. Which one?"
  - DIS-428: Improve checkpoint ticket detection
  - DIS-401: Linear integration improvements
  - None of these (I'll specify)
```

---

## Ask User Fallback (Step 8)

When no ticket can be detected and Linear search returns no matches:

```
AskUserQuestion:
  question: "Which Linear ticket should I checkpoint to?"
  options:
    - DIS-XXX (most recent from list-issues)
    - DIS-YYY (second most recent)
    - DIS-ZZZ (third most recent)
    - Other (user specifies)
```

---

## Multiple Ticket Handling

When user wants to checkpoint to multiple tickets:

```
/checkpoint DIS-322 DIS-323
```

Process:
1. Post same checkpoint comment to all specified tickets
2. Generate single handoff prompt referencing all tickets
3. Clear plan file once (not per ticket)

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Git command fails | Skip branch detection, continue |
| Plan file not found | Skip plan detection, continue |
| No candidates found | Ask user |
| Linear API fails | Warn, still generate handoff |
