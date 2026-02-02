# Step 4: Accelerate Cycle Time

Only accelerate what survives deletion and simplification. Speed on the wrong thing is waste.

## What is Cycle Time?

The time from "I want to change something" to "the change is live and I can see results."

This includes:
- Time to write the code
- Time to test
- Time to review
- Time to deploy
- Time to get feedback

## Why Cycle Time Matters

Fast cycles create compound advantages:
- More iterations → better product
- Faster feedback → fewer wrong turns
- Quicker fixes → lower cost of mistakes
- Rapid experiments → more learning

A team that ships 10x per day learns 10x faster than one that ships weekly.

## Where to Look for Acceleration

### Technology
| Slow | Fast |
|------|------|
| Manual environment setup | One-command setup |
| Tests take 10 minutes | Tests take 30 seconds |
| Weekly releases | Continuous deployment |
| Rollback is scary | Rollback is one button |

### Business
| Slow | Fast |
|------|------|
| Quarterly planning | Weekly experiments |
| 90-day sales cycle | Self-serve purchase |
| Committee decisions | Owner decides |
| Long contracts | Month-to-month |

### Operations
| Slow | Fast |
|------|------|
| Batch processing | Real-time processing |
| Monthly invoicing | Instant invoicing |
| Annual reviews | Continuous feedback |
| Scheduled maintenance | On-demand fixes |

### Communication
| Slow | Fast |
|------|------|
| Email chains | Instant message |
| Scheduled meetings | Ad-hoc calls |
| Formal proposals | Quick write-ups |
| Consensus building | Consult then decide |

### Learning
| Slow | Fast |
|------|------|
| Complete course first | Learn while doing |
| Read the docs | Try it and fail |
| Plan thoroughly | Prototype quickly |
| Wait for feedback | Ship and measure |

### Personal
| Slow | Fast |
|------|------|
| Optimize morning routine | Just start working |
| Research all options | Pick one, try it |
| Wait for perfect conditions | Start with what you have |
| Seek permission | Ask forgiveness |

## The 10x Question

For each step in your process, ask:

"What would it take to make this 10x faster?"

Not 10% faster (incremental optimization) - 10x faster (rethink the approach).

| Current | 10% faster | 10x faster |
|---------|------------|------------|
| 2-hour deploy | 1.5-hour deploy | 10-minute deploy |
| 3-day code review | 2.5-day code review | 4-hour code review |
| Weekly planning | Slightly faster meetings | No planning meetings (continuous) |

## Common Accelerations

### Remove Wait States
- Don't wait for approval - get pre-approval or forgiveness
- Don't wait for meetings - async communication
- Don't wait for perfect - ship and iterate

### Batch to Stream
- Don't batch releases - continuous deployment
- Don't batch feedback - real-time monitoring
- Don't batch decisions - decide as you go

### Automate Feedback
- Automated tests (know immediately if you broke something)
- Error tracking (know immediately if users hit issues)
- Analytics (know immediately if feature is used)

## The Constraint

Only accelerate after steps 1-3. Otherwise you're speeding up:
- Things that shouldn't exist (should have deleted)
- Things that are too complex (should have simplified)
- Things based on wrong requirements (should have questioned)

Fast in the wrong direction is worse than slow in the right direction.

## Examples

### Deployment
**Before:** "Our deploy process takes 4 hours because we run the full test suite, then QA manually checks, then we do a staged rollout."

**After:** "We deleted the manual QA step (automated tests cover it). We simplified the staged rollout (feature flags instead). Deploy now takes 15 minutes."

### Decision Making
**Before:** "Decisions take 2 weeks because we need sign-off from 3 stakeholders."

**After:** "We questioned why we need 3 sign-offs. Deleted 2 of them. Owner decides, informs others. Decisions now take 1 day."

### Hiring
**Before:** "Hiring takes 3 months: job post → screen → 6 interviews → committee → offer → negotiation."

**After:** "1 month: referral → 2 interviews with decision-maker → offer same day. No committee."

### Customer Support
**Before:** "Ticket → Triage → Level 1 → Level 2 → Engineering → Response. 5 days."

**After:** "Ticket → Person who can fix it. Same day."

### Sales
**Before:** "Lead → SDR → AE → Demo → Proposal → Legal → Close. 90 days."

**After:** "Self-serve trial → Buy online → Talk to human only if stuck. 7 days."

### Learning
**Before:** "Learn framework → Read docs → Build tutorial → Build small project → Build real thing."

**After:** "Build real thing. Look up what you need as you go."

### Product Feedback
**Before:** "Quarterly user research → Analysis → Roadmap planning → Build → Ship → Measure."

**After:** "Ship small change → Measure same day → Iterate tomorrow."

### Manufacturing
**Before:** "Design → Prototype → Test → Tooling → Production. 18 months."

**After:** "3D print prototype today. Test tomorrow. Iterate weekly. Tooling only after 10 iterations."

### Writing
**Before:** "Outline → Draft → Edit → Review → More edits → Publish."

**After:** "Write and publish. Edit live based on feedback."

### Meetings
**Before:** "Schedule → Agenda → Meet for 1 hour → Follow-up → Next meeting."

**After:** "15-minute standup. Decisions in Slack. Meet only when async fails."

## The Payoff

Faster cycles mean:
- More shots on goal
- Faster learning
- Lower cost of mistakes (you catch them sooner)
- Higher team morale (shipping feels good)

Time is the scarcest resource. Accelerate aggressively.
