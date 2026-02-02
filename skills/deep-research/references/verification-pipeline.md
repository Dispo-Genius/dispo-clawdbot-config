# Verification Pipeline

Three-layer verification system for validating research findings.

---

## Overview

The verification pipeline consists of three specialized agents that run in parallel during Phase 2:

1. **Fact-Checker** - Verifies claims against cited sources
2. **Consistency Checker** - Validates cross-agent agreement
3. **Credibility Assessor** - Rates source quality

Each layer catches different types of errors that the others might miss.

---

## Layer 1: Fact-Checking

### Purpose

Ensure claims made by research agents are actually supported by their cited sources.

### Common Issues Caught

| Issue | Description | Example |
|-------|-------------|---------|
| **Hallucination** | Claim not in source | "React 19 uses Rust" when source doesn't mention Rust |
| **Overstatement** | Source is more nuanced | "Always use X" when source says "X can be useful" |
| **Misinterpretation** | Wrong meaning extracted | Confusing a deprecated method with current approach |
| **Outdated attribution** | Source no longer valid | Citing docs from older version |

### Verification Process

```
For each claim:
1. Fetch the cited source URL/file
2. Search for text supporting the claim
3. Compare semantic meaning (not just keywords)
4. Rate match quality:
   - Strong: Direct quote or clear paraphrase
   - Moderate: Supported but requires inference
   - Weak: Tangentially related
   - None: Not found in source
```

### LLM-as-Judge Pattern

For semantic matching, the fact-checker uses this evaluation:

```markdown
Given this claim: "{claim}"
And this source text: "{source_excerpt}"

Rate how well the source supports the claim:
- STRONG: Source directly states or clearly implies this
- MODERATE: Source supports this with reasonable inference
- WEAK: Source is tangentially related but doesn't support
- NONE: Source does not support this claim

Explain your reasoning.
```

### Output Artifacts

- List of verified claims with evidence quotes
- List of unsupported/weak claims with issues
- Verification rate: (verified claims / total claims)

---

## Layer 2: Consistency Checking

### Purpose

Identify contradictions and agreements across multiple research agents.

### Techniques

#### SAC3-Style Semantic Consistency

Based on the SAC3 (Sampling-then-Aggregating with Consistency Checks) pattern:

1. **Cluster similar claims** from different agents
2. **Check semantic equivalence** - Do they say the same thing differently?
3. **Identify contradictions** - Do they say opposite things?
4. **Flag single-source claims** - Claims only one agent makes

#### Contradiction Types

| Type | Description | Handling |
|------|-------------|----------|
| **Direct** | A says X, B says not-X | Escalate to credibility check |
| **Numeric** | A says 10%, B says 50% | Check sources for accuracy |
| **Temporal** | A says "current", B says "deprecated" | Check recency of sources |
| **Scope** | A generalizes, B is specific | Usually reconcilable |

#### Agreement Strength

| Level | Description |
|-------|-------------|
| **Strong** | 3+ agents agree with consistent details |
| **Moderate** | 2 agents agree, details align |
| **Weak** | 2 agents agree, details differ |
| **Single** | Only 1 agent makes claim |

### Resolution Recommendations

When contradictions are found:

1. **Prefer higher-credibility sources** (see Layer 3)
2. **Prefer more recent sources** for evolving topics
3. **Prefer specificity** over generalization
4. **If equal, flag as unresolved** for synthesis

### Output Artifacts

- Multi-agent agreement matrix
- Contradiction list with resolution recommendations
- Single-source claims requiring caution

---

## Layer 3: Credibility Assessment

### Purpose

Evaluate trustworthiness of sources to inform which claims to weight more heavily.

### Credibility Tiers

| Tier | Type | Examples | Trust Level |
|------|------|----------|-------------|
| 1 | **Official** | Official docs, company blogs, RFCs | Highest |
| 2 | **Academic** | Peer-reviewed papers, research institutions | Very High |
| 3 | **Expert** | Recognized experts, authoritative tech blogs | High |
| 4 | **Community** | Stack Overflow, forums, tutorials | Medium |
| 5 | **Anonymous** | Unattributed, unknown authors | Low |

### Assessment Factors

#### Source Type (40% weight)
- What kind of source is this?
- Who published it?
- What's their authority on this topic?

#### Temporal Relevance (30% weight)
| Age | Decay Factor |
|-----|--------------|
| < 1 year | 1.0 (no decay) |
| 1-2 years | 0.9 |
| 2-3 years | 0.7 |
| 3-5 years | 0.5 |
| > 5 years | 0.3 |

For rapidly evolving topics (AI, frameworks), increase decay.
For stable topics (algorithms, fundamentals), decrease decay.

#### Bias Indicators (30% weight)
| Indicator | Description | Penalty |
|-----------|-------------|---------|
| Commercial interest | Vendor promoting own product | -1 tier |
| Marketing language | Excessive superlatives | -1 tier |
| Missing citations | Claims without evidence | -1 tier |
| Conflict of interest | Author benefits from conclusion | -1 tier |

### Domain-Specific Adjustments

| Domain | Preferred Sources |
|--------|-------------------|
| Programming languages | Official docs, language team blogs |
| Frameworks | Official docs, core team, release notes |
| Security | CVE databases, security researchers |
| Performance | Benchmarks with methodology |
| Best practices | Multiple expert consensus |

### Output Artifacts

- Source credibility ratings table
- High-credibility source list
- Low-credibility sources with concerns
- Overall source quality assessment

---

## Pipeline Integration

### Parallel Execution

All three verification agents run simultaneously:

```
Research Agent Outputs
         ↓
    ┌────┴────┐
    ↓    ↓    ↓
 Fact  Cons  Cred
Check  Check Assess
    ↓    ↓    ↓
    └────┬────┘
         ↓
   Combined Results
```

### Combined Scoring

Claims receive a combined verification score:

```
VerificationScore = (
  FactCheckScore * 0.4 +
  ConsistencyScore * 0.3 +
  CredibilityScore * 0.3
)

Where:
- FactCheckScore: Strong=1.0, Moderate=0.7, Weak=0.3, None=0
- ConsistencyScore: Strong=1.0, Moderate=0.7, Weak=0.4, Single=0.2
- CredibilityScore: Tier1=1.0, Tier2=0.9, Tier3=0.7, Tier4=0.4, Tier5=0.2
```

### Confidence Mapping

| Combined Score | Confidence Level |
|----------------|------------------|
| 0.8 - 1.0 | High (90%+) |
| 0.6 - 0.8 | Medium (70-89%) |
| 0.4 - 0.6 | Low (50-69%) |
| < 0.4 | Very Low (<50%) |

### Flagging for Synthesis

The verification pipeline outputs flags for the synthesis agent:

- **Green:** Well-verified, include confidently
- **Yellow:** Partially verified, include with caveats
- **Red:** Poorly verified, include only if essential with strong caveats
- **Black:** Should not be included (hallucination, contradiction)

---

## Quality Gates

### Minimum Thresholds

Before proceeding to synthesis, check:

| Metric | Minimum | Action if Failed |
|--------|---------|------------------|
| Verification rate | 60% | Flag quality concern |
| High-credibility sources | 30% | Seek better sources |
| Unresolved contradictions | < 20% | More investigation |

### Escalation Triggers

Escalate to user if:
- Verification rate < 40%
- Majority of sources are low-credibility
- Critical contradictions can't be resolved
