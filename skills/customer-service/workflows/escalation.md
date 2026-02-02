# Escalation Workflow

Hand off a ticket to human support.

## When to Use

Escalate when any of these apply:

**Customer-initiated:**
- Customer explicitly requests human
- "I want to talk to a real person"
- "Can I speak to someone?"

**Complexity:**
- 3+ back-and-forth without resolution
- Issue spans multiple systems
- Requires access AI doesn't have

**Sensitive:**
- Billing/refund requests
- Account cancellation
- Bug affecting data integrity
- Legal/compliance questions
- Privacy requests (GDPR, data deletion)

**Emotional:**
- Customer is frustrated/angry
- Repeated escalation requests
- Threatening language

## Process

### Step 1: Prepare Escalation Note

Gather from conversation:
- Issue summary (1-2 sentences)
- What was tried
- Why escalating
- Customer sentiment
- Relevant account details

### Step 2: Draft Handoff Note

Use template:

```
## Escalation: [Ticket ID]

**Customer:** [Name] ([email])
**Issue:** [1-2 sentence summary]
**Reason for escalation:** [specific trigger]

### Context
[Brief conversation history]
[What Polaris already tried]

### Customer Sentiment
[Neutral/Frustrated/Urgent]

### Recommended Action
[Suggestion for human agent]
```

### Step 3: Add Internal Note

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts reply-ticket <id> "[escalation note]" --internal
```

### Step 4: Update Ticket

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts update-ticket <id> \
  --status INPROGRESS \
  --add-tag escalated \
  --assignee "human-support"
```

Note: `human-support` should be replaced with actual team member ID from sync cache.

### Step 5: Notify Customer

Send brief acknowledgment:

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts reply-ticket <id> "Thanks for your patience. I'm connecting you with a team member who can help further. They'll be in touch shortly."
```

### Step 6: Alert Team

Post to Slack #support-escalations:

```
🚨 Escalation: [ticket-id]

Customer: [name]
Issue: [brief]
Reason: [escalation trigger]

Link: [gleap ticket url if available]
```

## Output

Confirm escalation:
- "Escalated [ticket-id] to human support"
- "Reason: [trigger]"
- "Team notified in #support-escalations"
