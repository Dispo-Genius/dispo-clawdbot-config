---
name: customer-service
description: Customer service for Dispo Genius via Gleap. Triggers on "support", "ticket", "customer question", "help request", "inbox review", "gleap", "customer service".
metadata: {"clawdbot":{"emoji":"🎧"}}
---

# Customer Service

Handle Dispo Genius customer support via Gleap integration.

## Quick Reference

```bash
# List open tickets
npx tsx ~/.claude/services/gleap-cc/src/index.ts list-tickets --status OPEN

# Get ticket details
npx tsx ~/.claude/services/gleap-cc/src/index.ts get-ticket <id>

# Reply to ticket
npx tsx ~/.claude/services/gleap-cc/src/index.ts reply-ticket <id> "message"

# Search knowledge base
npx tsx ~/.claude/services/gleap-cc/src/index.ts search-kb "query"

# Close ticket
npx tsx ~/.claude/services/gleap-cc/src/index.ts close-ticket <id> --note "Resolution"
```

## Workflows

| Workflow | Purpose |
|----------|---------|
| [inbox-review](workflows/inbox-review.md) | Daily triage of open tickets |
| [ticket-response](workflows/ticket-response.md) | Handle single ticket |
| [escalation](workflows/escalation.md) | Hand off to human support |
| [proactive-outreach](workflows/proactive-outreach.md) | Proactive customer contact |

## Service Philosophy

**Goal:** 6-7 star responses minimum, 8-star when opportunity arises.

We use world-class service frameworks:
- **11-Star Framework** - Design extreme delight, work backward to sustainable excellence
- **Disney HEARD** - Hear, Empathize, Apologize, Resolve, Diagnose
- **Ritz-Carlton** - Anticipation, ownership, $2000 empowerment rule
- **Zappos** - Authenticity over efficiency, genuine human connection
- **Apple APPLE** - Approach, Probe, Present, Listen, End

See [references/](references/) for detailed framework guides.

## Response Guidelines

**Tone:**
- Friendly, professional, helpful
- Use customer's first name
- Be concise but thorough
- Acknowledge the issue before solving

**Structure:**
1. Greeting with name
2. Acknowledge their issue
3. Provide solution or next steps
4. Offer additional help
5. Sign off

**Never:**
- Share internal notes with customers
- Promise timelines you can't keep
- Dismiss or minimize concerns
- Use jargon without explanation

## Knowledge Base Integration

Before responding to tickets:
1. Search KB: `gleap-cc search-kb "<keywords>"`
2. If match found: summarize and include article link
3. If no match: provide direct answer or escalate

## Escalation Rules

See [escalation-rules.md](references/escalation-rules.md) for when to hand off to humans.

**Auto-escalate:**
- Customer requests human explicitly
- 3+ back-and-forth without resolution
- Billing/refund requests
- Bug reports affecting data
- Legal/compliance questions

## Multi-Channel Handling

Gleap abstracts channels (in-app, email, WhatsApp). Adjust tone slightly:

| Channel | Style |
|---------|-------|
| In-app widget | Conversational, quick |
| Email | Slightly more formal, complete |
| WhatsApp | Brief, mobile-friendly |

## Templates & Frameworks

| Reference | Purpose |
|-----------|---------|
| [response-templates.md](references/response-templates.md) | Approved response templates |
| [11-star-framework.md](references/11-star-framework.md) | Airbnb's delight methodology |
| [service-frameworks.md](references/service-frameworks.md) | Disney, Ritz, Zappos, Apple |
| [delight-moments.md](references/delight-moments.md) | Surprise & delight playbook |

## Setup

```bash
# One-time setup
gateway-cc keys set GLEAP_API_KEY
gateway-cc keys set GLEAP_PROJECT_ID

# Sync project data
npx tsx ~/.claude/services/gleap-cc/src/index.ts sync
```
