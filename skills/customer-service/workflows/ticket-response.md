# Ticket Response Workflow

Handle a single customer support ticket with 6-star minimum quality.

## When to Use

- "Respond to ticket X"
- "Help this customer"
- "Handle support request"

## Target Quality

**Minimum:** 6-star (solve + anticipate + unexpected value)
**Aim for:** 7-star when triggers present (longtime customer, patient, provided feedback)

See [11-star-framework.md](../references/11-star-framework.md) for star level definitions.

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

### Step 4: Assess Emotion & Check Escalation

**Is customer frustrated/angry?** Apply HEARD model first:
1. **Hear** - Let them fully explain (may need to re-read carefully)
2. **Empathize** - "I understand how frustrating this is"
3. **Apologize** - Sincere, specific apology
4. **Resolve** - Fix with urgency
5. **Diagnose** - Note for systemic fix

See [service-frameworks.md](../references/service-frameworks.md) for full HEARD guide.

**Check escalation rules:** Review [escalation-rules.md](../references/escalation-rules.md).

**Escalate if:**
- Customer requested human
- Issue is billing/refund related
- Bug affecting data integrity
- Legal/compliance question
- 3+ messages without resolution

If escalating, go to [escalation.md](./escalation.md).

### Step 5: Draft Response (6-Star Minimum)

Use template from [response-templates.md](../references/response-templates.md).

**Before drafting, ask:**
1. What's the stated problem? (Must solve completely)
2. What's the obvious follow-up question? (Anticipate it)
3. What unexpected value can I add? (One extra thing)
4. Is there a delight trigger? (Check [delight-moments.md](../references/delight-moments.md))

**6-Star Format:**
```
Hi [FirstName],

[Empathy - acknowledge the impact, not just the facts]

[Solution - complete and specific]

[Anticipation - address the next question they'd ask]

[Unexpected value - one thing they didn't expect]

[If KB article relevant: "You can also find more details here: [link]"]

[Personal close - not generic]

Best,
[Support Team / Polaris]
```

**7-Star additions (if triggers present):**
- Recognize them as individual (tenure, contribution)
- Tangible gesture (credit, feature unlock, priority flag)
- Reference something specific from their context

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
