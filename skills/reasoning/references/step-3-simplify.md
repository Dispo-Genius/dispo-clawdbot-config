# Step 3: Simplify

Only simplify what survives deletion. Never optimize something that shouldn't exist.

## Order Matters

1. Delete first (Step 2)
2. Simplify what remains (Step 3)

This order is critical. Simplifying something you should have deleted is waste.

## What Simplification Looks Like

### Reduce Moving Parts
- 3 services → 1 service
- 5 database tables → 2 tables
- 10 configuration options → 3 options

### Reduce Concepts
- 4 user types → 2 user types
- 6 states in workflow → 3 states
- Multiple ways to do same thing → one canonical way

### Reduce Dependencies
- 10 npm packages → 5 packages
- External API calls → local computation where possible
- Microservices → monolith (if team is small)

## The Simplification Test

For each component, ask:

1. **Can these two things be one thing?** Merge when possible.
2. **Does this need to be configurable?** Hardcode sensible defaults.
3. **Is this abstraction earning its keep?** Inline if not.
4. **Would a new person understand this in 5 minutes?** If not, simplify.

## Common Simplifications

### Technology
| Complex | Simple |
|---------|--------|
| Microservices | Monolith |
| Event sourcing | CRUD |
| Kubernetes | Single server |
| Custom solution | Off-the-shelf tool |

### Business
| Complex | Simple |
|---------|--------|
| 4 pricing tiers | 1 price |
| Custom contracts | Standard terms |
| 6 customer segments | 2 segments |
| Global expansion | One market first |

### Operations
| Complex | Simple |
|---------|--------|
| 8 vendors | 2 vendors |
| Custom workflows per client | Standard workflow |
| Matrix organization | Clear ownership |
| Consensus decisions | Single owner decides |

### Personal
| Complex | Simple |
|---------|--------|
| Complex budget with 20 categories | 3 buckets: save, spend, give |
| 5 productivity apps | 1 note-taking app |
| Elaborate morning routine | Wake up, start |
| Networking strategy | Help people, stay in touch |

### Communication
| Complex | Simple |
|---------|--------|
| 5 communication tools | 1 tool (everything in Slack/email) |
| Elaborate status reports | One-line updates |
| Meeting with 10 people | Meeting with 3 decision-makers |
| Written spec + meeting + follow-up | Just the spec |

### Product
| Complex | Simple |
|---------|--------|
| Customizable dashboard | Fixed dashboard that works |
| Workflow builder | Predefined workflows |
| User-defined fields | Fixed schema |
| Plugin architecture | Built-in integrations |

## The Premature Abstraction Trap

"We might need to support multiple databases."
→ You probably won't. Use Postgres directly.

"We might need to swap out the payment provider."
→ You probably won't. Use Stripe directly.

"We might have different business rules per region."
→ You probably won't. Hardcode your current rules.

Wait for the second use case before abstracting. The first implementation teaches you what the abstraction should actually be.

## Simplicity Requires Courage

Simplification feels risky because:
- It removes flexibility ("what if we need X later?")
- It looks less "enterprise" (fewer boxes in the diagram)
- It seems less impressive (simple solutions look obvious in hindsight)

But simplicity is a feature, not a bug:
- Simple systems have fewer failure modes
- Simple systems are easier to debug
- Simple systems are faster to change
- Simple systems can be understood by one person

## Examples

### Architecture
**Before:**
```
User → API Gateway → Auth Service → User Service → Database
                  ↓
              Rate Limiter → Cache Layer
```

**After:**
```
User → Monolith → Database
       (auth, rate limiting, caching built-in)
```

### Product
**Before:** "Pluggable notification system supporting email, SMS, push, Slack, webhooks"

**After:** "We send emails. That's it."

### Business Model
**Before:** "We have 4 pricing tiers with usage-based add-ons and annual discounts and enterprise custom pricing."

**After:** "One price. $99/month. Everything included."

### Manufacturing
**Before:** "47 parts from 12 suppliers assembled in 3 facilities."

**After:** "15 parts from 3 suppliers assembled in 1 facility."

### Operations
**Before:** "Customer onboarding involves 8 teams and 23 handoffs."

**After:** "One person owns the customer from sign-up to success."

### Personal Finance
**Before:** "5 bank accounts, 3 credit cards, 2 investment accounts, manual tracking."

**After:** "1 bank, 1 credit card, 1 investment account, auto-transfers."

### Communication
**Before:** "We use Slack, email, Notion, Asana, and weekly syncs."

**After:** "We use Slack. Everything else is in Slack."

### Supply Chain
**Before:** "Just-in-time delivery from global suppliers with complex logistics."

**After:** "Local suppliers, larger inventory buffer, simpler logistics."

### Legal
**Before:** "47-page contract with custom terms for each client."

**After:** "2-page standard agreement. Take it or leave it."

### Scheduling
**Before:** "Flexible meeting times, back-and-forth to find availability."

**After:** "I take meetings Tuesday and Thursday 2-5pm. Calendly link."

## The Payoff

Simple systems:
- Deploy faster
- Break less
- Fix quicker
- Scale easier (paradoxically)
- Onboard new people faster

Complexity is debt. Simplicity is leverage.
