# Step 1: Question Every Requirement

The most dangerous requirements are the ones that seem obvious. They're dangerous because no one questions them.

## The Core Questions

For every requirement, ask:

1. **Who made this requirement?** Get a name, not a department.
2. **Why does it exist?** What problem was it solving?
3. **Is the original problem still real?** Contexts change.
4. **What happens if we delete it?** Often: nothing bad.

## Red Flags

Requirements to scrutinize hardest:

| Red Flag | Why It's Suspicious | Example |
|----------|---------------------|---------|
| "We've always done it this way" | Inertia, not logic | "We've always had weekly reports" |
| "Legal/compliance requires it" | Often misunderstood or outdated | "Legal said we need 3 approvals" |
| "The customer asked for it" | Customers describe solutions, not problems | "They asked for a dashboard" |
| "It's industry standard" | Standards lag behind what's possible | "Everyone uses X" |
| "It's a best practice" | Best for whom? When? Why? | "Best practice is to have staging" |
| "We need it for enterprise" | Vague appeal to imaginary buyers | "Enterprise needs SSO" |
| "What if we need it later?" | Fear-driven, not data-driven | "What if we scale to 10x?" |
| "It's only 2 hours of work" | Maintenance is forever | "Let's just add this feature" |

## The Smart Person Trap

Smart engineers are the most dangerous source of requirements. Why? Because you're unlikely to question a smart person.

If a requirement came from a smart person, question it MORE, not less. Smart people can be wrong, and their errors propagate further because people don't push back.

## Examples

### Technology
**Bad:** "The spec says we need OAuth2 with refresh tokens."
→ Implements OAuth2

**Good:** "Who wrote this? Why OAuth2 specifically? What are we actually protecting?"
→ Discovers the requirement was copy-pasted from another project. API keys suffice.

### Business
**Bad:** "We need a sales team because that's how B2B works."
→ Hires 10 salespeople

**Good:** "Who said we need outbound sales? What problem are we solving? How are customers finding us now?"
→ Discovers 80% of customers come through word-of-mouth. Invests in product instead.

### Manufacturing
**Bad:** "Parts must be inspected 3 times before shipping."
→ Hires QA team, slows production

**Good:** "Who added the 3rd inspection? When? What defects does it catch that the first two miss?"
→ Discovers 3rd inspection catches 0.01% more defects. Eliminated.

### Personal
**Bad:** "I need to respond to emails within an hour."
→ Constant interruptions, no deep work

**Good:** "Who expects this? What actually happens if I respond in 4 hours? Has anyone complained?"
→ Discovers no one notices. Batches email twice daily.

### Hiring
**Bad:** "Candidates need 5 years experience and a CS degree."
→ Rejects great candidates

**Good:** "Who set these criteria? What do 5 years actually give us? What skills matter?"
→ Discovers the best hire had 2 years experience and no degree.

### Meetings
**Bad:** "We have weekly status meetings because the team needs alignment."
→ 10 people × 1 hour × 52 weeks = 520 hours/year

**Good:** "Who started this meeting? What decisions come from it? What breaks if we cancel it?"
→ Discovers it's purely informational. Replaced with async update.

## Questions to Surface Hidden Requirements

- "What assumptions are baked into this?"
- "What would a competitor with no legacy do?"
- "If we started from zero today, would we add this?"
- "What's the cost of being wrong about this requirement?"

## The Payoff

Every requirement you successfully delete:
- Removes code you don't have to write
- Removes bugs you don't have to fix
- Removes complexity you don't have to explain
- Removes surface area you don't have to maintain

The best requirement is no requirement. The best feature is no feature.
