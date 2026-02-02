# Ticket Response Workflow

Handle a single customer support ticket.

## When to Use

- "Respond to ticket X"
- "Help this customer"
- "Handle support request"

## Process

### Step 1: Get Ticket Details

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts get-ticket <id>
```

Capture:
- Customer name/email
- Issue description
- Conversation history
- Current status/priority
- Tags

### Step 2: Get User Context

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts get-user <userId> --tickets
```

Understand:
- Is this a new or returning user?
- Their history with support
- Account value/tier

### Step 3: Search Knowledge Base

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts search-kb "<keywords from issue>"
```

If articles found:
- Review relevance
- Extract key points to include
- Note article link for customer

### Step 4: Check Escalation Rules

Review [escalation-rules.md](../references/escalation-rules.md).

**Escalate if:**
- Customer requested human
- Issue is billing/refund related
- Bug affecting data integrity
- Legal/compliance question
- 3+ messages without resolution

If escalating, go to [escalation.md](./escalation.md).

### Step 5: Draft Response

Use template from [response-templates.md](../references/response-templates.md).

**Format:**
```
Hi [FirstName],

[Acknowledge their issue in 1 sentence]

[Solution or next steps - be specific]

[If KB article relevant: "You can also find more details here: [link]"]

Let me know if you have any other questions!

Best,
[Support Team / Polaris]
```

### Step 6: User Approval

**Use AskUserQuestion:**
```
Draft response for [ticket-id]:

"[full response text]"

Options:
- Send as-is
- Edit response
- Escalate instead
- Skip for now
```

### Step 7: Send Response

If approved:

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts reply-ticket <id> "<approved response>"
```

### Step 8: Update Status (if resolved)

If the issue is fully resolved:

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts close-ticket <id> --note "Resolved: [brief summary]"
```

Otherwise, update status:

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts update-ticket <id> --status INPROGRESS
```

## Output

Confirm action taken:
- "Responded to [ticket-id] for [customer name]"
- "Ticket [id] closed - [resolution summary]"
- "Ticket [id] escalated - [reason]"
