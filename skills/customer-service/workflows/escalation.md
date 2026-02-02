# Escalation Workflow

Hand off a ticket to human support - but try de-escalation first when appropriate.

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

## De-Escalation First (For Emotional Triggers)

Before escalating frustrated customers, try HEARD model recovery:

### HEARD Model
1. **Hear** - Read their full message without jumping to defense
2. **Empathize** - "I completely understand your frustration"
3. **Apologize** - Own it: "I'm sorry this happened" (not "sorry you feel...")
4. **Resolve** - Fix with urgency + tangible gesture
5. **Diagnose** - "I'm flagging this so we can prevent it"

### De-escalation Response Template
```
Hi [Name],

You're absolutely right to be frustrated - [acknowledge specific issue] is not acceptable.

I'm sorry we let you down on this. No excuses.

Here's what I've done:
1. [Immediate fix]
2. [Compensation/gesture]
3. [Prevention measure]

If you'd prefer to speak with a team member directly, just say the word - I'll connect you immediately. Otherwise, I'm committed to making this right.
```

### When De-escalation Won't Work
- Customer has explicitly requested human 2+ times
- Threatening or abusive language
- Legal implications
- You've already tried HEARD without improvement

In these cases, escalate immediately. Don't prolong frustration.

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
