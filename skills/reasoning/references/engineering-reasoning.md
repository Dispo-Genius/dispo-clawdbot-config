# Engineering Reasoning

First principles thinking applied to engineering decisions.

## 1. Failure Mode Analysis

For every system, ask: **"What happens when this fails?"**

### The Failure Questions

| Question | Why It Matters |
|----------|----------------|
| **What can fail?** | Identify failure modes |
| **How will we know?** | Detection/alerting |
| **What's the blast radius?** | Scope of impact |
| **How do we recover?** | Manual or automatic? |
| **What's the recovery time?** | Minutes? Hours? Days? |

### Failure Mode Categories

| Mode | Example | Mitigation Pattern |
|------|---------|-------------------|
| **Total failure** | Service down | Redundancy, failover |
| **Partial failure** | Some requests fail | Retries, circuit breakers |
| **Silent failure** | Wrong data, no error | Validation, monitoring |
| **Cascading failure** | One failure triggers others | Bulkheads, timeouts |
| **Slow failure** | Degraded performance | Backpressure, shedding |

### The Pre-Mortem

Before building, imagine it's 6 months later and everything went wrong. Ask:
- What failed?
- Why didn't we see it coming?
- What would we have done differently?

This surfaces blind spots before they become incidents.

## 2. State Location Heuristic

**The question:** "Where does the state live?"

| Fewer state locations | More state locations |
|----------------------|---------------------|
| Simpler to reason about | Complex synchronization |
| Easier to debug | "Which one is right?" |
| Single source of truth | Consistency bugs |

### State Location Principles

1. **Minimize state locations.** Every copy is a liability.
2. **Derive don't duplicate.** Calculate from source, don't cache.
3. **If you must duplicate, define the source of truth.** What wins on conflict?
4. **State should live as close to its user as possible.** But only one place.

### Common State Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Caching derived data | Stale data bugs | Compute on read |
| Multiple databases with overlap | Sync inconsistencies | Single source + read replicas |
| Local state duplicating server | "Save" doesn't work | Server-driven state |
| Props drilling state down | Prop hell | State management or composition |

**Debugging state bugs:** Draw where every piece of state lives. Find the duplicates. Eliminate them.

## 3. Debugging as Reasoning

**The process:** Reproduce → Isolate → Verify

### Reproduction First

Can't reproduce = can't fix. Before anything else:
1. Get exact steps to reproduce
2. Get exact environment details
3. Verify you can trigger the bug

### Binary Search Isolation

Once reproducible:
1. Find two points: one where it works, one where it doesn't
2. Bisect between them (git bisect, code bisect, time bisect)
3. Narrow to smallest possible diff

### The "What Changed?" Question

Most bugs are regressions. Ask:
- What changed recently?
- What was deployed?
- What config changed?
- What dependency updated?

### Debugging Anti-Patterns

| Anti-Pattern | Why It's Wrong | Better |
|--------------|---------------|--------|
| "It works on my machine" | Environment is a variable | Reproduce in shared env |
| Random changes until it works | No understanding | Form hypothesis, test |
| Debugging production | Risk of more damage | Reproduce in staging |
| Long debugging sessions | Diminishing returns | Time-box, fresh eyes |

## 4. Architecture Decision Triggers

**One-way doors** that require extra scrutiny:

| Trigger | Why It's One-Way | Questions to Ask |
|---------|------------------|------------------|
| **New process boundary** | Service = new deployment, versioning, network | Can this stay in-process? |
| **New data store** | Migration is painful | Can existing store handle it? |
| **New external dependency** | Lock-in, availability coupling | What if they go down/change API? |
| **Schema changes** | Data migration, backward compat | Can we add without changing existing? |
| **Public API** | Clients depend on it forever | Is this the right contract? |

### The ADR Moment

When hitting a trigger, write a decision record (2 minutes):
1. What's the decision?
2. What options were considered?
3. Why this option?
4. What are we accepting as risk?

Not for process—for future you who forgot.

## 5. Build vs Buy

Three questions:

### 1. Is this core differentiation?

| If yes... | If no... |
|-----------|----------|
| Building is investment in moat | Building is distraction |
| Worth the maintenance cost | Find commodity solution |

**Test:** Would customers pay more because we built this ourselves?

### 2. Do we need significant customization?

| If yes... | If no... |
|-----------|----------|
| Consider building | Off-the-shelf works |
| Or: can we extend bought solution? | Don't invent requirements |

**Test:** Write down exact customizations needed. Are they real or imagined?

### 3. Can we afford the maintenance?

| Factor | Build | Buy |
|--------|-------|-----|
| Initial cost | Higher | Lower |
| Ongoing cost | Engineering time | License fees |
| Risk | On us | On vendor |
| Flexibility | Total | Within product limits |

**The hidden cost:** Built solutions need: documentation, testing, on-call, upgrades, security patches. Forever.

### Build vs Buy Decision Tree

```
Is it core differentiation?
├── Yes → Lean toward build
└── No → Do we need significant customization?
    ├── Yes → Can we extend bought solution?
    │   ├── Yes → Buy and extend
    │   └── No → Build (reluctantly)
    └── No → Buy
```

## 6. Engineering Deletion

Delete code with the same enthusiasm as writing it.

### High-Value Deletion Targets

| Target | Why Delete |
|--------|------------|
| **Dead code** | Maintenance burden, confusion |
| **Unused config** | "What does this do?" |
| **Single-use abstractions** | Premature generalization |
| **Feature flags for shipped features** | Clean up after launch |
| **Compatibility shims** | Migrate and remove |
| **Unused dependencies** | Security surface, build time |

### Safe Deletion Process

1. **Identify candidate.** Static analysis, coverage, search.
2. **Verify unused.** Check callers, check production logs.
3. **Delete.** Don't comment out. Delete.
4. **Verify build/tests pass.** Immediate feedback.
5. **Monitor.** Watch for errors post-deploy.

### Deletion Resistance

"What if we need it later?"
- Git has history
- Rewriting is often better than unearthing

"It's not hurting anything."
- It's hurting readability
- It's confusing new engineers
- It's maintenance surface area

## 7. Performance Reasoning

**Rule:** Measure first. Optimize second.

### The Performance Question Order

1. **Is it actually slow?** Measure, don't guess.
2. **Does it matter?** Is this on the critical path?
3. **What's the bottleneck?** Profile, don't speculate.
4. **What's the simplest fix?** Algorithm change > clever optimization.

### User-Perceived vs CPU Performance

| User-perceived | CPU efficiency |
|----------------|----------------|
| Time to interactive | Server CPU usage |
| Time to first meaningful paint | Memory consumption |
| Responsiveness | Throughput |

**Priority:** User-perceived latency > CPU efficiency (usually)

### Common Performance Mistakes

| Mistake | Reality |
|---------|---------|
| "This loop is slow" | It runs 10 times. It's fine. |
| "We need caching" | What's actually slow? |
| "We need to parallelize" | Is there actually contention? |
| "We need a faster language" | Almost never the bottleneck |

### When to Optimize

1. Users are complaining about specific slowness
2. You have measurements showing the problem
3. You've identified the actual bottleneck
4. The fix is worth the complexity

## 8. Engineering Anti-Patterns

### "We might need this later" (YAGNI)

**Reality:** You probably won't need it. If you do, requirements will have changed.

**Cost of early abstraction:**
- Wrong abstraction is worse than no abstraction
- Maintenance of unused code
- Cognitive load for readers

**Fix:** Build what you need now. Refactor when you actually need more.

### "Let's add an abstraction"

**Reality:** Three concrete cases before abstracting. Otherwise you're guessing.

**Signs of premature abstraction:**
- Abstraction serves one use case
- Parameters that are always the same value
- "Just in case" flexibility

**Fix:** Duplicate code is fine until you see the pattern clearly.

### "We need microservices"

**Reality:** Microservices are for organizational scaling, not technical scaling.

**Monolith is fine when:**
- Team is small (<20 engineers)
- Deployment bottleneck isn't team coordination
- You can't articulate specific service boundaries

**Fix:** Start monolith. Extract services at clear boundaries when needed.

### "Let's rewrite it"

**Reality:** Rewrites take 2-3x longer than estimated and often fail.

**Why rewrites fail:**
- Old system has hidden requirements
- Second system effect (over-engineer)
- Business pressure to ship

**Fix:** Incremental improvement. Strangle pattern. Rewrite only modules, not systems.

### "This code is legacy/technical debt"

**Reality:** Often this means "code I didn't write" or "code I don't understand."

**Actual technical debt:**
- Code that's actively slowing you down
- Code that causes recurring bugs
- Code that can't be safely modified

**Fix:** Quantify the cost. "This causes X hours/week of extra work." Then prioritize like any other work.
