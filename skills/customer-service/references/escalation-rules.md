# Escalation Rules

When to hand off tickets to human support.

## Automatic Escalation Triggers

### Customer-Initiated
- Customer explicitly requests human: "Can I talk to a person?", "real support", "human please"
- Multiple requests for escalation
- "I've asked this before" / "This is my Nth time asking"

### Complexity
- **3+ message exchanges** without resolution
- Issue spans multiple systems or requires backend access
- Requires data changes AI cannot make
- Account-specific issues requiring verification

### Sensitive Topics
| Topic | Reason |
|-------|--------|
| Billing/refunds | Financial decisions require human approval |
| Account cancellation | Retention opportunity, verification needed |
| Data deletion | Legal/GDPR compliance |
| Legal questions | Liability concerns |
| Privacy requests | Compliance requirements |
| Security concerns | Potential breach investigation |

### Emotional Signals
- Frustrated language: "This is ridiculous", "I've been waiting forever"
- Caps lock or excessive punctuation
- Threatening to leave/cancel
- Mentioning competitors
- Profanity (even censored)

### Technical Severity
- Bug affecting **data integrity** (lost data, corruption)
- Bug affecting **payments** (charged incorrectly, failed payments)
- Bug affecting **security** (unauthorized access, exposed data)
- System-wide outage reports

---

## Do NOT Escalate

Handle these directly:
- How-to questions
- Feature explanations
- General feedback
- Feature requests
- Minor UI issues
- Password resets
- Basic troubleshooting

---

## Escalation Priority

### Priority 1 (Immediate)
- Security concerns
- Data loss
- Payment failures
- Legal/compliance

### Priority 2 (Within 1 hour)
- Frustrated/angry customer
- 3+ failed resolution attempts
- Billing disputes

### Priority 3 (Same day)
- Customer-requested escalation (polite)
- Complex technical issues
- Feature requests from VIP accounts

---

## Escalation Process

1. **Add internal note** with context
2. **Update ticket** with escalated tag
3. **Assign** to human support queue
4. **Notify customer** that human is coming
5. **Alert team** in #support-escalations

---

## Human Support Assignments

| Issue Type | Assign To |
|------------|-----------|
| Billing/refunds | billing-team |
| Technical bugs | engineering |
| Account issues | account-support |
| General escalation | support-lead |

Note: Replace with actual user IDs from `gleap-cc sync` cache.

---

## Escalation Note Template

```
## Escalation: [Ticket ID]

**Reason:** [Trigger that caused escalation]
**Customer:** [Name] ([email])
**Sentiment:** [Neutral / Frustrated / Angry / Urgent]

### Summary
[1-2 sentence issue description]

### What Was Tried
- [Action 1]
- [Action 2]

### Context
[Relevant conversation history]

### Recommended Action
[Suggestion for human agent]
```
