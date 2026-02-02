---
name: reasoning
description: First principles reasoning and optimization methodology. Applies the Idiot Index, requirement questioning, and 5-step optimization process (question, delete, simplify, accelerate, automate). Triggers on problem-solving, decision-making, evaluating requirements, planning features, how should we approach, help me think through, what is the best way to.
---

**REQUIRED: Activate UltraThink mode before proceeding.**

# First Principles Reasoning

**Core belief:** Most complexity is accumulated cruft, not necessity. Question everything.

## Invocation

```
/reasoning                    # Full 7-step workflow with report
/reasoning --quick            # Quick Start (30 seconds) - no tasks
```

## Quick Start Mode (--quick)

For rapid decisions, skip tasks and use this 30-second framework:

1. What are we actually trying to achieve? (outcome, not solution)
2. Is this reversible? (two-way door → decide fast)
3. What can we delete?
4. What's the simplest version that works?

No report generated. Direct answer provided.

---

## MANDATORY WORKFLOW (Full Invocation)

When `/reasoning` is invoked (without --quick), complete these steps IN ORDER:

### Step 0: Initialize Task Checklist

**MUST execute first.** Create tasks with TaskCreate:

```
TaskCreate (7 tasks):

1. subject: "Establish ground truth"
   description: "Verify understanding vs assumptions. Question user's framing. Seek disconfirming evidence. Calibrate confidence levels."
   activeForm: "Establishing ground truth"

2. subject: "Question every requirement"
   description: "For each requirement: Who made it? Why? Is it necessary or assumed? Apply red flag detection."
   activeForm: "Questioning requirements"

3. subject: "Delete aggressively"
   description: "Apply 10% rule. For each component: What breaks if deleted? When last used? Cost to add back later?"
   activeForm: "Identifying deletions"

4. subject: "Simplify what remains"
   description: "Reduce moving parts, concepts, dependencies. Apply simplification test. Check for premature abstractions."
   activeForm: "Simplifying solution"

5. subject: "Accelerate cycle time"
   description: "Apply 10x question. Remove wait states. Batch to stream. Automate feedback loops."
   activeForm: "Accelerating cycles"

6. subject: "Evaluate automation candidates"
   description: "Only automate stable, understood, high-ROI processes. Calculate break-even. Avoid automation traps."
   activeForm: "Evaluating automation"

7. subject: "Generate reasoning report"
   description: "Compile findings from all steps. Include confidence levels, idiot index, recommendations."
   activeForm: "Generating report"
```

**As you complete each step:**
1. Mark current step `in_progress` before starting
2. Capture findings for that step
3. Mark step `completed` immediately after finishing
4. Only ONE step should be `in_progress` at a time

---

### Step 1: Establish Ground Truth

**TaskUpdate:** Mark "Establish ground truth" as `in_progress`

Before optimizing anything, verify you understand reality:

| Check | Questions |
|-------|-----------|
| 1.1 Question Understanding | What do I actually know vs assume? What evidence supports my view? What would change my mind? |
| 1.2 Question User's Framing | Is the stated problem the real problem? What assumptions are baked in? Red flags: "obviously," "clearly," "we all know" |
| 1.3 Seek Disconfirming Evidence | What would prove this wrong? Who would disagree and why? Steelman the opposite view |
| 1.4 Calibrate Confidence | High (verified), Medium (good evidence, gaps), Low (educated guess), Unknown (need to investigate) |

#### Truth-Seeking Checkpoints

**Falsification Protocol:**
- For each major claim, state what evidence would prove it wrong
- Identify cruxes: beliefs that if changed would change your conclusion
- Did you actively search for disconfirming evidence (not just ask yourself)?

**Reference Class Forecasting:**
- What category does this belong to? (rewrites, migrations, "quick fixes", etc.)
- What typically happens to things in this class?
- Base rate: {typical outcome for this reference class}
- Why would this situation differ from the base rate? (specific evidence only)

**Pre-Mortem:**
```
Imagine it's 6 months from now and this failed. What happened?
1. {failure mode - most likely}
2. {failure mode - most damaging}
3. {failure mode - most embarrassing}
```

**Murphyjitsu Test:**
- Imagine announcing this plan to smart critics. Do you feel a twinge of doubt?
- Is there a part you glossed over hoping no one asks?
- Would you be surprised if it works exactly as planned?

**Output:** `"[Step 1/7] Ground Truth: {1-2 sentence summary of problem reframe, if any}"`

**Capture:**
```yaml
GROUND_TRUTH:
  stated_problem: "{original problem}"
  actual_problem: "{reframed if different}"
  key_assumptions: ["{assumption 1}", "{assumption 2}"]
  confidence: "{High|Medium|Low|Unknown}"
  evidence_gaps: ["{gap 1}", "{gap 2}"]
  cruxes: ["{belief that if wrong changes everything}"]
  reference_class: "{what category, base rate}"
  failure_modes: ["{pre-mortem findings}"]
```

**TaskUpdate:** Mark "Establish ground truth" as `completed`

---

### Step 2: Question Every Requirement

**TaskUpdate:** Mark "Question every requirement" as `in_progress`

For each requirement identified:

| Requirement | Who Made It | Why It Exists | Still Necessary? | Red Flags |
|-------------|-------------|---------------|------------------|-----------|
| {req 1} | {name/team} | {rationale} | {Yes/No/Maybe} | {flags} |

**Red Flags to Check:**
- "We've always done it this way" (inertia)
- "Legal/compliance requires it" (often misunderstood)
- "The customer asked for it" (solution vs problem)
- "It's best practice" (whose best? when? why?)
- "What if we need it later?" (fear-driven)
- Smart person's requirement (most dangerous - rarely questioned)

**Output:** `"[Step 2/7] Requirements: {N} questioned, {M} flagged for deletion"`

**Capture:**
```yaml
REQUIREMENTS:
  total: {N}
  flagged_deletion: [{req}]
  flagged_review: [{req}]
  approved: [{req}]
  smart_person_trap: "{any requirements from smart people that weren't questioned?}"
```

**TaskUpdate:** Mark "Question every requirement" as `completed`

---

### Step 3: Delete Aggressively

**TaskUpdate:** Mark "Delete aggressively" as `in_progress`

Apply the 10% rule: Whatever is planned, delete 10% before proceeding.

For each component/feature/process:

| Item | What Breaks If Deleted? | Last Used/Needed? | Cost to Add Back? | Decision |
|------|-------------------------|-------------------|-------------------|----------|
| {item 1} | {impact} | {date/never} | {low/medium/high} | {Keep/Delete} |

**Deletion Test:**
1. Run the mental experiment of deleting it
2. If you can't remember when it was last needed, delete it
3. If cost to add back is low, delete it
4. If you're not adding back 10% of what you delete, you're not deleting enough

**Output:** `"[Step 3/7] Deletion: {N} items marked for removal"`

**Capture:**
```yaml
DELETIONS:
  items_reviewed: {N}
  deleted: [{item, rationale}]
  kept: [{item, rationale}]
  deletion_ratio: "{X}% (target: 10%+)"
```

**TaskUpdate:** Mark "Delete aggressively" as `completed`

---

### Step 4: Simplify What Remains

**TaskUpdate:** Mark "Simplify what remains" as `in_progress`

Only simplify what survived deletion. Apply simplification test:

| Component | Can Merge With? | Configurable → Hardcoded? | Abstraction Earning Keep? | Simplified Form |
|-----------|-----------------|---------------------------|---------------------------|-----------------|
| {comp 1} | {yes/no: what} | {yes/no: what} | {yes/no} | {result} |

**Common Simplifications:**
- 3 services → 1 service
- 5 database tables → 2 tables
- Multiple ways to do same thing → one canonical way
- "Would a new person understand in 5 minutes?" test

**Output:** `"[Step 4/7] Simplification: {N} components simplified"`

**Capture:**
```yaml
SIMPLIFICATIONS:
  reviewed: {N}
  changes: [{before, after, rationale}]
  abstractions_inlined: [{what, why}]
  premature_abstractions: [{what}]
```

**TaskUpdate:** Mark "Simplify what remains" as `completed`

---

### Step 5: Accelerate Cycle Time

**TaskUpdate:** Mark "Accelerate cycle time" as `in_progress`

For each remaining process, apply the 10x question: "What would it take to make this 10x faster?"

| Process | Current Time | 10% Faster | 10x Faster | Recommendation |
|---------|--------------|------------|------------|----------------|
| {proc 1} | {time} | {incremental} | {rethink} | {action} |

**Acceleration Patterns:**
- Remove wait states (approvals, meetings, perfect conditions)
- Batch to stream (releases, feedback, decisions)
- Automate feedback loops (tests, monitoring, analytics)
- Parallelization: what can happen simultaneously?

**The 10x Question:** If someone offered $10M to ship this tomorrow, what would you cut?

**Output:** `"[Step 5/7] Acceleration: {N} bottlenecks identified"`

**Capture:**
```yaml
ACCELERATIONS:
  reviewed: {N}
  bottlenecks: [{process, current, proposed}]
  wait_states_removed: [{what}]
  batch_to_stream: [{what}]
```

**TaskUpdate:** Mark "Accelerate cycle time" as `completed`

---

### Step 6: Evaluate Automation

**TaskUpdate:** Mark "Evaluate automation candidates" as `in_progress`

**Only automate AFTER steps 1-5.** For each remaining manual process:

| Process | Done Many Times? | Same Every Time? | Process Stable? | ROI Clear? | Automate? |
|---------|------------------|------------------|-----------------|------------|-----------|
| {proc 1} | {yes/no} | {yes/no} | {yes/no} | {calc} | {Yes/No/Wait} |

**Automation ROI:**
```
Time to automate: X hours
Time saved per occurrence: Y minutes
Occurrences per month: Z
Break-even: X / (Y × Z) months
```

**Automation Traps:**
- Automating before understanding → fragile automation
- Automating waste → fast waste
- Automating before simplifying → complex automation

**Output:** `"[Step 6/7] Automation: {N} candidates, {M} approved"`

**Capture:**
```yaml
AUTOMATION:
  reviewed: {N}
  approved: [{what, roi}]
  rejected: [{what, reason}]
  deferred: [{what, condition}]
```

**TaskUpdate:** Mark "Evaluate automation candidates" as `completed`

---

### Step 7: Generate Report

**TaskUpdate:** Mark "Generate reasoning report" as `in_progress`

Compile all findings into structured report using template below.

**TaskUpdate:** Mark "Generate reasoning report" as `completed`

---

## Report Template

```markdown
# First Principles Analysis Report

**Problem:** {stated problem}
**Reframed:** {actual problem, if different}
**Confidence:** {High|Medium|Low} - {rationale}

## Idiot Index Analysis

```
Idiot Index = Cost of Current Approach / Cost of Minimal Solution
```

| Metric | Current | Minimal | Ratio | Interpretation |
|--------|---------|---------|-------|----------------|
| Time | {X} | {Y} | {X/Y} | {analysis} |
| Complexity | {X} | {Y} | {X/Y} | {analysis} |
| Resources | {X} | {Y} | {X/Y} | {analysis} |

**Hidden Waste:** {where the highest ratios indicate waste}

## Step-by-Step Findings

### 1. Ground Truth
- **Stated vs Actual Problem:** {summary}
- **Key Assumptions Challenged:** {list}
- **Evidence Gaps:** {list}

### 2. Requirements Questioned
- **Total:** {N} requirements examined
- **Flagged for Deletion:** {list with rationale}
- **Red Flags Detected:** {list}

### 3. Deletions
- **Deleted:** {list with rationale}
- **Deletion Ratio:** {X}% (target: 10%+)
- **Key Insight:** {what deletions revealed}

### 4. Simplifications
- **Changes:** {before → after list}
- **Abstractions Removed:** {list}
- **Complexity Reduction:** {estimate}

### 5. Accelerations
- **Bottlenecks:** {list}
- **10x Opportunities:** {list}
- **Wait States Removed:** {list}

### 6. Automation
- **Approved:** {list with ROI}
- **Rejected:** {list with reason}
- **Deferred:** {list with conditions}

## Final Recommendations

| Priority | Recommendation | Impact | Effort | Confidence |
|----------|----------------|--------|--------|------------|
| 1 | {rec} | {H/M/L} | {H/M/L} | {%} |
| 2 | {rec} | {H/M/L} | {H/M/L} | {%} |
| 3 | {rec} | {H/M/L} | {H/M/L} | {%} |

## Truth-Seeking Assessment

### Falsification Protocol

| Claim | What Would Disprove It | Searched For? | Status |
|-------|------------------------|---------------|--------|
| {claim 1} | {falsification criteria} | {yes/no} | {confirmed/falsified/open} |

**Cruxes (beliefs that if wrong, change everything):**
1. {crux} - confidence: {%}
2. {crux} - confidence: {%}

### Reference Class Forecast

```
Inside view: {your estimate based on this situation}
Reference class: {similar past situations}
Base rate: {what typically happens}
Anchored estimate: {adjusted based on base rate}
Deviation justification: {why this would differ, if at all}
```

### Pre-Mortem Results

| Failure Mode | Probability | Mitigation | Early Warning Sign |
|--------------|-------------|------------|-------------------|
| {most likely} | {%} | {action} | {indicator} |
| {most damaging} | {%} | {action} | {indicator} |
| {most embarrassing} | {%} | {action} | {indicator} |

### Blind Spots Checked

| Bias | Question Asked | Finding |
|------|----------------|---------|
| Confirmation | Did I seek disconfirming evidence? | {finding} |
| Anchoring | Am I influenced by first number heard? | {finding} |
| Survivorship | Am I only seeing successes? | {finding} |
| Sunk cost | Would I make this choice starting fresh? | {finding} |

## Red Team Assessment

- **Weakest Point:** {what's most likely to fail}
- **Steelmanned Alternative:** {best case for approach rejected}
- **Hidden Assumptions:** {what must be true for this to work}
- **Ideological Turing Test:** Can you explain the opposing view so a proponent would say "yes, that's what I believe"?

## Confidence Calibration

| Aspect | Confidence | Evidence Quality | Source Type |
|--------|------------|------------------|-------------|
| Problem framing | {H/M/L} | {direct/indirect/assumed} | {direct/primary/secondary/hearsay} |
| Deletion decisions | {H/M/L} | {direct/indirect/assumed} | {direct/primary/secondary/hearsay} |
| Recommendations | {H/M/L} | {direct/indirect/assumed} | {direct/primary/secondary/hearsay} |

**Weakest Evidence Link:** {which piece of evidence, if wrong, breaks the conclusion}
```

---

## Reversibility Frame

| Type | Examples | Approach |
|------|----------|----------|
| Two-way door | Most code, features, designs, copy | Decide fast, reverse if wrong |
| One-way door | Public APIs, data schemas, brand, pricing, team cuts | Slow down, gather evidence |

**The test:** "If this is wrong, can we undo it in a week without major cost?"
- Yes → Move fast
- No → Invest in getting it right

---

## The Three Models

### 1. The Idiot Index

```
Idiot Index = Cost of Finished Product / Cost of Raw Materials
```

High ratio = hidden inefficiency. Ask: "Why does this cost 10x the materials?"

Apply to: time, money, complexity, code, process.

**Example:** A feature takes 2 weeks. The actual code is 50 lines. Where did the other 9.5 days go?

### 2. First Principles Decomposition

**Not:** "How has this been done before?"
**Instead:** "What is actually true? What's possible from there?"

Process:
1. Identify the fundamental truths (physics, constraints, actual requirements)
2. Ignore how it's "normally done"
3. Reason up from the fundamentals

### 3. The Algorithm (5-Step Optimization)

Execute IN ORDER. Do not skip steps.

```
1. QUESTION THE REQUIREMENTS
   - Who made this requirement? Why?
   - The most dangerous requirements are the smart people's requirements

2. DELETE THE PART/PROCESS
   - Best part is no part. Best process is no process.
   - If you're not adding back 10% of what you delete, you're not deleting enough

3. SIMPLIFY/OPTIMIZE
   - Only after you've deleted. Don't optimize something that shouldn't exist.

4. ACCELERATE CYCLE TIME
   - Only after simplifying. Speed up what remains.

5. AUTOMATE
   - LAST, not first. Don't automate waste.
```

**Critical:** Most people start at step 3 or 5. This is wrong. Always start at step 1.

---

## Deep Dives

| Step | Reference |
|------|-----------|
| 0. Ground Truth | [references/truth-seeking.md](references/truth-seeking.md) |
| 1. Question Requirements | [references/step-1-question.md](references/step-1-question.md) |
| 2. Delete | [references/step-2-delete.md](references/step-2-delete.md) |
| 3. Simplify | [references/step-3-simplify.md](references/step-3-simplify.md) |
| 4. Accelerate | [references/step-4-accelerate.md](references/step-4-accelerate.md) |
| 5. Automate | [references/step-5-automate.md](references/step-5-automate.md) |

## Domain Reasoning

| Domain | Reference |
|--------|-----------|
| Design | [references/design-reasoning.md](references/design-reasoning.md) |
| Engineering | [references/engineering-reasoning.md](references/engineering-reasoning.md) |

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| "We've always done it this way" | Appeal to tradition | Ask why it started |
| "Best practice says..." | Appeal to authority | Ask if it applies here |
| "We need this for edge cases" | Premature complexity | Delete it, add back if needed |
| "Let's automate this" | Automating waste | Run steps 1-5 first |
| "We should optimize X" | Optimizing before questioning | Ask if X should exist |
| Skipping to Step 5 | Automating before understanding | ALWAYS start at Step 1 |

---

## The Meta-Rule

If you find yourself adding complexity, stop. The goal is REMOVAL, not addition. The best solution is the one with the fewest parts that still works.

When in doubt: delete, simplify, then stop.

---

## Urgency Mindset

**Time is the ultimate constraint.** Every day wasted is permanent.

- Iteration speed > initial quality (you'll iterate anyway)
- "When is the soonest this could ship?" not "When will this be ready?"
- Set aggressive deadlines, then work backwards
- If it takes 2 weeks, ask: "What would make this take 2 days?"
- Parallelization: what can happen simultaneously?

---

## Cost Obsession

Everything has a cost. Make tradeoffs explicit.

| Question | Apply To |
|----------|----------|
| What's the $ cost? | Features, infrastructure, meetings, headcount |
| What's the time cost? | Yours, team's, user's, maintenance |
| What's the opportunity cost? | What aren't we doing? |
| What's the complexity cost? | Every line of code is a liability |

**The Napkin Test:** Can you justify this cost on a napkin in 30 seconds?

---

## Constraint Attacks

Most constraints are fake. Attack them relentlessly.

**The "Why Can't We Just..." Pattern:**
- "Why can't we just... ship without feature X?"
- "Why can't we just... use off-the-shelf instead of building?"
- "Why can't we just... ask the customer directly?"
- "Why can't we just... delete this entire system?"

**Constraint Categories:**
| Type | Example | Attack |
|------|---------|--------|
| Physics | Speed of light | Accept (real) |
| Legal | Data residency | Verify with lawyer (often misunderstood) |
| Technical | "Our stack can't do X" | Challenge (usually solvable) |
| Process | "We need approval from..." | Bypass or simplify |
| Historical | "We tried that and it failed" | Conditions may have changed |

**Most "can't" statements are actually "don't want to" or "haven't tried".**

---

## Cross-Domain Thinking

The best solutions come from other fields. Actively import.

**Domains to raid:**
- **Manufacturing:** Batch vs flow, bottleneck theory, quality at source
- **Physics:** First principles, energy conservation, phase transitions
- **Biology:** Evolution, immune systems, feedback loops
- **Economics:** Incentives, markets, game theory
- **Military:** OODA loops, fog of war, logistics

**The Translation Pattern:**
1. Identify the abstract pattern in the problem
2. Ask: "Where else does this pattern exist?"
3. Study how that domain solved it
4. Translate the solution back

---

## Red Team Checkpoint

Before presenting conclusions:

1. **Attack your own plan** - What's the weakest point?
2. **Steelman alternatives** - What's best case for options you rejected?
3. **Identify hidden assumptions** - What must be true for this to work?
4. **Express confidence honestly** - Where are you most/least certain?

See also: [references/truth-seeking.md](references/truth-seeking.md) for epistemic framework.
