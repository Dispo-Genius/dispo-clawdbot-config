# Step 2: Delete

The best part is no part. The best process is no process.

If you're not deleting at least 10% of what you originally planned, you're not trying hard enough.

## The Principle

Deletion is the most powerful optimization. It has infinite ROI - you remove cost entirely, not just reduce it.

Yet deletion is underused because:
- It feels like failure ("we designed this for nothing")
- It's invisible work (no one sees what you didn't build)
- It requires confidence (saying "we don't need this")

## What to Delete

### Features & Products
- Features no one uses (check data)
- Features that duplicate others
- Features that exist "just in case"
- Products that drain resources but don't grow

### Process & Workflow
- Meetings that could be async
- Approvals that always approve
- Steps that exist "for visibility"
- Reports no one reads
- Handoffs that add delay but not value

### Business
- Customer segments that aren't profitable
- Partnerships that take more than they give
- Channels that don't convert
- Services that distract from core offering

### Personal
- Commitments made from guilt
- Possessions you haven't used in a year
- Subscriptions you forget you have
- Relationships that only drain energy

### Technology
- Dead code paths
- Abstractions with one implementation
- Configuration options no one changes
- Integrations no one uses

### Communication
- Newsletters you don't read
- Slack channels that are noise
- Recurring meetings with no decisions
- Status updates no one acts on

## The Deletion Test

Before keeping anything, ask:

1. **What breaks if we delete this?** Run the experiment mentally.
2. **When was this last used/needed?** If you can't remember, delete it.
3. **What's the cost of adding it back later?** Usually lower than maintaining it.

## Adding Back is Cheap

Fear of deletion comes from thinking it's permanent. It's not.

- Code is in git - you can restore it
- Features can be re-added when actually needed
- The knowledge to rebuild exists

What's expensive is carrying unnecessary weight forever.

## Examples

### Product
"We have 47 settings in the admin panel."
→ Check: 3 are ever changed
→ Delete the other 44, hardcode sensible defaults

### Code
"We have a plugin architecture for payment providers."
→ Check: We've used Stripe for 4 years, no plans to change
→ Delete the abstraction, inline Stripe directly

### Process
"We have a weekly planning meeting."
→ Check: Last 3 meetings resulted in "continue what we're doing"
→ Delete the meeting, make it ad-hoc when plans actually change

### Manufacturing
"Every unit gets a 47-point inspection checklist."
→ Check: 40 points have never found a defect
→ Delete 40 points, keep the 7 that matter

### Business
"We serve 6 customer segments with different pricing."
→ Check: 2 segments drive 90% of revenue
→ Delete 4 segments, focus on the 2 that matter

### Personal Productivity
"I check email, Slack, Twitter, news every morning."
→ Check: Twitter and news have never led to important action
→ Delete them from the routine

### Marketing
"We're on 8 social platforms."
→ Check: 2 drive all the leads
→ Delete the other 6, double down on 2

### Reporting
"We generate 12 weekly reports."
→ Check: 3 get read, 9 go to folders
→ Delete 9 reports

### Features
"Our app has 5 ways to export data."
→ Check: 95% use CSV export
→ Delete the other 4

### Hiring
"Our interview process has 6 rounds."
→ Check: Round 4-6 rarely change the decision
→ Delete rounds 4-6, decide after 3

## The 10% Rule

Whatever you're planning to build, delete 10% of it before starting.

- 10 features planned → ship 9
- 10 API endpoints → ship 9
- 10 fields in the form → ship 9

This forces prioritization and often reveals that the 10% wasn't needed.

## Resistance Patterns

When you propose deletion, you'll hear:

| Objection | Response |
|-----------|----------|
| "But what if we need it later?" | We'll add it when we need it. |
| "Someone might use it" | Who? When did they last? |
| "It's already built" | Sunk cost. Maintenance isn't free. |
| "It doesn't hurt to keep it" | Complexity always hurts. |

## The Payoff

Every deletion:
- Reduces cognitive load
- Reduces maintenance burden
- Reduces attack surface
- Reduces onboarding time
- Reduces decision fatigue

Delete aggressively. Add reluctantly.
