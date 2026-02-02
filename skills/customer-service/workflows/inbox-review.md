# Inbox Review Workflow

Daily triage of all open support tickets.

## When to Use

- Morning inbox review
- "Check support tickets"
- "Any customer issues?"
- Periodic monitoring

## Process

### Step 1: Fetch Open Tickets

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts list-tickets --status OPEN --limit 50 --sort -createdAt
```

### Step 2: Categorize by Priority

Review each ticket and categorize:

**Urgent (handle immediately):**
- Keywords: "urgent", "broken", "can't access", "payment failed"
- Wait time > 24 hours
- Priority already set to HIGH/URGENT

**Standard (handle today):**
- General questions
- Feature requests
- How-to questions

**Low (batch later):**
- Feature suggestions
- General feedback
- Non-blocking issues

### Step 3: For Each Urgent Ticket

1. Get full details: `gleap-cc get-ticket <id>`
2. Search KB for answer: `gleap-cc search-kb "<keywords>"`
3. If confident answer exists:
   - Draft response using template
   - **AskUserQuestion:** Review before sending
   - Send: `gleap-cc reply-ticket <id> "<response>"`
4. If unclear or complex:
   - Flag for escalation
   - Add internal note: `gleap-cc reply-ticket <id> "[Needs review]" --internal`

### Step 4: Generate Summary Report

After review, summarize:

```
## Inbox Review Summary

**Date:** [today]
**Open tickets:** [count]
**Urgent:** [count] - [brief list]
**Standard:** [count]
**Escalated:** [count] - [reasons]

### Actions Taken
- Responded to: [list]
- Escalated: [list with reasons]
- Flagged for follow-up: [list]

### Patterns Noticed
[Any recurring issues or trends]
```

### Step 5: Notify Team (if escalations)

If any tickets were escalated, post to Slack:

```bash
# Via manage-slack skill
Post to #support-escalations:
"[count] tickets escalated from inbox review:
- [ticket-id]: [brief reason]
..."
```

## Output

Report summary in chat. No action without user confirmation for responses.
