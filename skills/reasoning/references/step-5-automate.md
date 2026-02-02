# Step 5: Automate

Automation is the LAST step, not the first.

## Why Last?

The most common engineering mistake is automating too early:

1. Automating something that shouldn't exist → waste
2. Automating something too complex → complex automation
3. Automating before understanding → automating the wrong thing
4. Automating before the process is stable → constant rework

## The Automation Trap

"Let's build a system to automate X."

Wrong questions:
- How do we automate this?
- What tools should we use?
- How do we scale this?

Right questions (in order):
1. Should X exist at all? (Step 1: Question)
2. Can we delete X? (Step 2: Delete)
3. Can we simplify X? (Step 3: Simplify)
4. Can we make X faster manually? (Step 4: Accelerate)
5. NOW: Should we automate X? (Step 5: Automate)

## When to Automate

Only automate when:
- You've done it manually many times
- You understand the edge cases
- The process is stable (not changing)
- The ROI is clear

| Automate | Don't Automate |
|----------|----------------|
| Done 100+ times | Done 3 times |
| Same every time | Different each time |
| Process is stable | Process is evolving |
| Clear ROI | "Might be useful" |

## The Manual-First Principle

Do it manually until the pain is unbearable.

Benefits of manual-first:
- You understand the problem deeply
- You discover edge cases
- You learn what actually needs automating
- You avoid automating wrong thing

## Automation ROI

Before automating, calculate:

```
Time to automate: X hours
Time saved per occurrence: Y minutes
Occurrences per month: Z
Break-even: X / (Y × Z) months
```

Example:
- Automation takes: 40 hours
- Saves: 30 minutes each time
- Happens: 10 times/month
- Break-even: 40 / (0.5 × 10) = 8 months

Is 8 months acceptable? Maybe not if the process might change.

## Common Automation Mistakes

### Automating Complexity
**Technology:** "Our deployment has 47 steps. Let's script all of them."
→ Better: Delete 40 steps first, simplify 5, then automate 2.

**Business:** "Our approval workflow has 12 stages. Let's build a workflow engine."
→ Better: Question why 12 stages. Delete 9. Automate the remaining 3.

### Automating Variance
**Support:** "Each customer has different onboarding. Let's build a workflow engine."
→ Better: Standardize onboarding to 2 variants, handle manually, then maybe automate.

**Sales:** "Each deal has custom pricing. Let's build a pricing configurator."
→ Better: Standardize to 3 pricing tiers. Handle exceptions manually.

### Premature Infrastructure
**Data:** "Let's build a data pipeline for future analytics needs."
→ Better: Export to CSV when you need data. Build pipeline when CSV becomes unbearable.

**Marketing:** "Let's build a marketing automation system for future campaigns."
→ Better: Send emails manually. Automate when you're sending the same email 100 times.

### Automating Before Understanding
**ML:** "Let's build an ML model to classify support tickets."
→ Better: Manually classify 1000 tickets first. Learn the patterns. Then decide if ML is needed.

**Hiring:** "Let's build an AI to screen resumes."
→ Better: Screen 500 resumes yourself. Learn what actually predicts success. Then maybe automate.

## Good vs Bad Automation

### Technology
**Good:** Automated deployments (after process is stable and simplified)
**Bad:** Automated code review (judgment required, context-dependent)

### Business
**Good:** Automated invoicing (predictable, repetitive)
**Bad:** Automated pricing decisions (strategy, judgment, relationships matter)

### Personal
**Good:** Automated bill pay (predictable, no judgment needed)
**Bad:** Automated email responses (context-dependent, relationships matter)

### Manufacturing
**Good:** Automated quality checks on standardized metrics
**Bad:** Automated supplier negotiations (relationships, context matter)

### Marketing
**Good:** Automated report generation (same format every week)
**Bad:** Automated content creation before you know what resonates

### Operations
**Good:** Automated backup and monitoring (predictable, critical)
**Bad:** Automated incident response before you understand failure patterns

## What to Automate

Good automation candidates (after steps 1-4):

| Domain | Automate | Why |
|--------|----------|-----|
| Technology | Deployments, testing, monitoring | Predictable, repetitive, critical |
| Finance | Invoicing, payroll, recurring payments | Predictable, rule-based |
| Operations | Backups, inventory reordering | Threshold-based, no judgment |
| Communication | Meeting scheduling, reminders | Repetitive, rule-based |
| Reporting | Standard weekly/monthly reports | Same format, same data |
| Security | Scanning, access review alerts | Predictable patterns |

Bad automation candidates:

| Domain | Don't Automate | Why |
|--------|----------------|-----|
| Technology | Code review, architecture decisions | Judgment, context required |
| Sales | Relationship building, pricing strategy | Human connection matters |
| Hiring | Final hiring decisions | Judgment, bias risk |
| Support | Complex customer issues | Empathy, context required |
| Strategy | Business decisions | Too much variance |
| Creative | Content before you know what works | Need to learn first |

## The Payoff

Good automation (after steps 1-4):
- Eliminates toil
- Reduces human error
- Frees up time for higher-value work
- Scales linearly

Bad automation (skipping steps 1-4):
- Automates waste
- Creates maintenance burden
- Locks in complexity
- Becomes legacy system

## The Sequence Matters

```
1. Question → Is this requirement real?
2. Delete   → Can we remove this entirely?
3. Simplify → Can we make this simpler?
4. Accelerate → Can we make this faster manually?
5. Automate → NOW can we automate what's left?
```

Automation is the reward for doing steps 1-4 well. It's not a shortcut to skip them.
