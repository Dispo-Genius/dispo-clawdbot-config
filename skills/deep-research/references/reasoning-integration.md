# Reasoning Integration

How deep research agents use the `/reasoning` skill for truth-seeking.

---

## Overview

Every research agent applies first-principles reasoning before concluding. This prevents:
- Accepting claims without scrutiny
- Including unnecessary information
- Overcomplicating findings
- Missing the simplest explanation

---

## Quick vs Full Reasoning

### Quick Reasoning (Research Agents)

Used by: `research-web`, `research-codebase`, `research-deep`

**When:** Before concluding each research phase

**Framework:**
```markdown
## Reasoning Check

1. **What am I actually trying to find?**
   {restate the specific question}

2. **Is this claim falsifiable?**
   {can it be verified or disproven?}

3. **What can I delete from findings?**
   {remove noise, tangents, redundancy}

4. **What's the simplest explanation?**
   {Occam's razor - prefer simpler over complex}
```

**Duration:** ~30 seconds of thinking

### Full Reasoning (Synthesis Agent)

Used by: `research-synthesis`

**When:** Before producing final synthesis

**Framework:**
```markdown
## Full Reasoning Analysis

### 1. Question Requirements
- Why was this researched?
- What would a good answer look like?
- Are there implicit requirements I should question?

### 2. Delete
- What findings are actually irrelevant?
- What's redundant across agents?
- What's noise vs signal?

### 3. Simplify
- Can I explain this more simply?
- Am I overcomplicating the answer?
- What's the essence?

### 4. Accelerate (for future research)
- What patterns can speed up similar research?
- What sources are most reliable for this topic?

### 5. Automate (for future research)
- What can be systematized?
- What checks should be automatic?
```

**Duration:** 1-2 minutes of thinking

---

## Application Points

### Phase 1: Initial Research

Each research agent applies quick reasoning before submitting findings:

```markdown
## Research Findings: {dimension}

[... findings ...]

### Reasoning Application

**What am I actually trying to find?**
I was investigating {specific question}. My findings address this by {how}.

**Is this claim falsifiable?**
- Claim X: Yes, could verify via {method}
- Claim Y: Partially, based on source authority

**What can I delete?**
- Removed {N} tangential findings about {topic}
- Consolidated {redundant information}

**What's the simplest explanation?**
The core finding is: {one sentence summary}
```

### Phase 2: Verification

Verification agents apply reasoning to their assessments:

**Fact-Checker:**
```markdown
Am I being too strict or too lenient in verification?
- Being strict on: {topics requiring high accuracy}
- Being lenient on: {topics where approximation is acceptable}
```

**Consistency Agent:**
```markdown
Are apparent contradictions actually about different things?
- Contradiction 1: Actually about different {aspects/versions/contexts}
- Contradiction 2: Genuine disagreement requiring resolution
```

**Credibility Agent:**
```markdown
Am I being appropriately skeptical?
- Under-skeptical about: {sources I should distrust more}
- Over-skeptical about: {sources that are actually reliable}
```

### Phase 3: Gap Analysis

Gap agent applies reasoning to termination decision:

```markdown
### Reasoning: Termination Decision

**Am I being too perfectionist?**
- {assessment of whether gaps are truly critical}

**What's the minimum viable answer?**
- Core question can be answered: {yes/no}
- Missing pieces are: {critical/nice-to-have}

**Decision:** {SYNTHESIS/DEEP DIVE}
```

### Phase 5: Synthesis

Full reasoning before final synthesis:

```markdown
### Full Reasoning Analysis

**1. Question Requirements**
The original query asked: {query}
A good answer would include: {criteria}
Implicit assumption to question: {assumption}

**2. Delete**
Removing from synthesis:
- {irrelevant finding 1}
- {redundant point from multiple agents}
- {tangential information}

**3. Simplify**
Core answer in one paragraph: {summary}
Complexity needed for: {only these aspects}

**4. Pattern Recognition**
For similar future queries:
- Start with: {source type}
- Focus on: {dimension}

**5. Pre-Mortem**
If this answer is wrong, likely because:
- {failure mode 1}
- {failure mode 2}
```

---

## Reasoning Prompts

### For Research Agents

Include in every research agent prompt:

```markdown
## REASONING REQUIREMENT

Before submitting your findings, apply quick reasoning:

1. **What am I actually trying to find?**
   Restate the specific question you're answering.

2. **Is this claim falsifiable?**
   For each major claim, can it be verified or disproven?

3. **What can I delete from findings?**
   Remove noise, tangents, and redundancy.

4. **What's the simplest explanation?**
   Apply Occam's razor - prefer simpler over complex.

Include your reasoning in your output under "### Reasoning Application"
```

### For Synthesis Agent

Include in synthesis prompt:

```markdown
## REASONING REQUIREMENT

Apply full first-principles reasoning before synthesis:

1. **Question Requirements** - Why was this researched? What assumptions should be questioned?

2. **Delete** - What's irrelevant, redundant, or noise?

3. **Simplify** - Can you explain this more simply? What's the essence?

4. **Pre-Mortem** - If the conclusions are wrong, why would that be?

Document your reasoning process before presenting synthesis.
```

---

## Anti-Hallucination Through Reasoning

### Falsifiability Check

Every claim should pass:
```
Can this claim be verified against the cited source?
├── Yes → Include with citation
├── Partially → Include with caveat
└── No → Mark as "unverified assertion"
```

### Grounding Check

Before including any claim in synthesis:
```
Does this claim trace to a research agent output?
├── Yes → Include
└── No → DO NOT INCLUDE (would be hallucination)
```

### Simplicity Check

When multiple explanations exist:
```
Which explanation requires fewer assumptions?
├── Simpler explanation → Prefer
└── Complex explanation → Only if simpler fails
```

---

## Confidence Calibration

### Expression Format

```markdown
**Confidence: {percentage}%**
- High confidence (90%+): Multiple verified sources agree
- Medium confidence (70-89%): Single strong source or moderate agreement
- Low confidence (50-69%): Limited sources or some contradictions
- Very low (<50%): Speculation based on weak evidence
```

### Required Statements

```markdown
**I'm confident because:** {evidence basis}
**I'm uncertain about:** {specific aspects}
**If wrong, likely because:** {failure mode}
```

### "I Don't Know" is Valid

When evidence is insufficient:
```markdown
This question cannot be reliably answered because:
- {reason 1}
- {reason 2}

What we DO know: {limited findings}
What we DON'T know: {gaps}
```

---

## Integration with /reasoning Skill

When the main orchestrating agent needs to make decisions, invoke the full `/reasoning` skill:

```bash
/reasoning --quick    # For tactical decisions during research
/reasoning            # For strategic decisions about approach
```

### Decision Points Requiring /reasoning

1. **Query ambiguous:** How to interpret?
2. **Unexpected findings:** Change research direction?
3. **Contradictions:** Which source to prefer?
4. **Scope creep:** Stay focused or expand?
5. **Quality concerns:** Continue or escalate?
