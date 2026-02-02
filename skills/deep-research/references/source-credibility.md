# Source Credibility

How to assess and rate source trustworthiness.

---

## Credibility Tiers

### Tier 1: Official Sources (Highest Trust)

**Examples:**
- Official documentation (React docs, Python docs)
- Company engineering blogs (Netflix Tech Blog, Stripe Engineering)
- RFCs and specifications
- Official release notes and changelogs
- Government/regulatory publications

**Characteristics:**
- Published by the authoritative entity
- Reviewed/approved before publication
- Maintained and updated
- Clear authorship and accountability

**Trust Factor:** 1.0

---

### Tier 2: Academic Sources (Very High Trust)

**Examples:**
- Peer-reviewed papers (ACM, IEEE, arXiv with citations)
- Research institution publications
- University course materials
- Academic surveys and meta-analyses

**Characteristics:**
- Peer review process
- Citations and references
- Methodology transparency
- Reproducible findings

**Trust Factor:** 0.9

---

### Tier 3: Expert Sources (High Trust)

**Examples:**
- Recognized industry experts' blogs
- Technical authors with credentials
- Conference talks (Strange Loop, QCon)
- Books from respected publishers
- Well-maintained open source project docs

**Characteristics:**
- Known expertise in the field
- Track record of accuracy
- Cites sources when making claims
- Acknowledges limitations

**Trust Factor:** 0.7

**How to identify experts:**
- Core contributors to relevant projects
- Published authors on the topic
- Frequent conference speakers
- Citations by other experts

---

### Tier 4: Community Sources (Medium Trust)

**Examples:**
- Stack Overflow (highly-voted answers)
- GitHub issues and discussions
- Reddit (from knowledgeable users)
- Medium/Dev.to articles
- Tutorial sites (with verification)

**Characteristics:**
- Peer validation through votes/engagement
- Variable quality
- May be outdated
- Practical/applied focus

**Trust Factor:** 0.4

**Quality signals:**
- Upvote count (Stack Overflow: 10+ is good, 100+ is excellent)
- Answer accepted by questioner
- Author has high reputation
- Multiple answers agreeing

---

### Tier 5: Anonymous/Unverified (Low Trust)

**Examples:**
- Anonymous blog posts
- Unattributed content
- Social media posts
- AI-generated content (unverified)
- Marketing materials

**Characteristics:**
- No clear authorship
- No verification process
- May have hidden agenda
- Often unsubstantiated claims

**Trust Factor:** 0.2

**Use with extreme caution:**
- Only if no better sources exist
- Always flag as low-confidence
- Cross-verify with other sources

---

## Temporal Relevance

### Decay Factors

| Age | Standard Topics | Fast-Moving Topics |
|-----|-----------------|-------------------|
| < 6 months | 1.0 | 1.0 |
| 6-12 months | 1.0 | 0.8 |
| 1-2 years | 0.9 | 0.6 |
| 2-3 years | 0.7 | 0.4 |
| 3-5 years | 0.5 | 0.2 |
| > 5 years | 0.3 | 0.1 |

### Topic Classification

**Fast-Moving (High Decay):**
- AI/ML frameworks and models
- JavaScript ecosystem
- Cloud services
- Security vulnerabilities
- API versions

**Standard (Normal Decay):**
- Programming languages
- Design patterns
- Databases
- Networking protocols
- Operating systems

**Stable (Low Decay):**
- Algorithms and data structures
- Mathematical foundations
- Core language features
- Hardware architecture
- Fundamental CS concepts

---

## Bias Indicators

### Commercial Bias

**Red Flags:**
- Vendor publishing about their own product
- Comparison always favoring sponsor
- Missing disclosure of relationships
- Excessive superlatives ("best", "revolutionary")

**Adjustment:** -1 tier

### Ideological Bias

**Red Flags:**
- Strong opinions without evidence
- Dismissing alternatives without analysis
- Us-vs-them framing
- Cherry-picked examples

**Adjustment:** -1 tier

### Outdated Information

**Red Flags:**
- References deprecated features
- No updates despite changes in field
- Broken links to sources
- Screenshots of old interfaces

**Adjustment:** Apply temporal decay

### Missing Evidence

**Red Flags:**
- Claims without citations
- "Everyone knows" statements
- No code examples for technical claims
- No methodology for benchmarks

**Adjustment:** -1 tier

---

## Domain-Specific Guidelines

### Programming Languages

| Source Type | Preferred | Avoid |
|-------------|-----------|-------|
| Syntax/features | Official docs | Random tutorials |
| Best practices | Style guides (Google, Airbnb) | Opinionated blogs |
| Performance | Benchmarks with methodology | Anecdotal claims |
| New features | Release notes, RFCs | Secondary coverage |

### Frameworks (React, Next.js, etc.)

| Source Type | Preferred | Avoid |
|-------------|-----------|-------|
| API usage | Official docs | Pre-release tutorials |
| Patterns | Core team blogs | Old tutorials |
| Migration | Official guides | Stack Overflow (version mismatch) |
| Edge cases | GitHub issues | Unverified forums |

### Security

| Source Type | Preferred | Avoid |
|-------------|-----------|-------|
| Vulnerabilities | CVE database, NIST | Social media announcements |
| Best practices | OWASP, CIS | Marketing content |
| Tools | Security researcher blogs | Anonymous claims |
| Compliance | Official standards | Summarized interpretations |

### Architecture

| Source Type | Preferred | Avoid |
|-------------|-----------|-------|
| Patterns | MSFT/AWS/Google guides | Opinionated single source |
| Trade-offs | Engineering blogs with data | Theoretical discussions |
| Case studies | Published postmortems | Anecdotal claims |
| Scale | Companies at that scale | Speculation |

---

## Credibility Scoring Formula

```
FinalScore = (BaseTier × TemporalDecay × BiasAdjustment)

Where:
- BaseTier: 1.0 to 0.2 based on tier
- TemporalDecay: 1.0 to 0.1 based on age
- BiasAdjustment: 1.0 (none), 0.8 (minor), 0.5 (significant)
```

### Example Calculations

**Official React docs (current):**
```
1.0 × 1.0 × 1.0 = 1.0 (High)
```

**Stack Overflow answer (2 years old, 50 votes):**
```
0.4 × 0.6 × 1.0 = 0.24 (Low-Medium)
```

**Vendor blog about their product:**
```
0.7 × 1.0 × 0.5 = 0.35 (Low)
```

---

## Quick Assessment Checklist

```markdown
□ Who wrote it? (authorship)
□ When was it written? (temporal)
□ Where was it published? (platform credibility)
□ Why was it written? (motivation/bias)
□ What evidence supports claims? (substantiation)
□ Do other sources agree? (consensus)
```

---

## Integration with Research

### During Research

Tag each source as you find it:
```markdown
[Source: URL] Tier: {1-5}, Age: {date}, Confidence: {%}
```

### During Verification

Credibility agent produces:
```markdown
| Source | Tier | Age | Bias | Final |
|--------|------|-----|------|-------|
| {url} | 2 | 1yr | None | High |
```

### In Final Report

```markdown
## Sources
| # | Source | Type | Credibility |
|---|--------|------|-------------|
| 1 | {url} | Official | High |
| 2 | {url} | Expert Blog | Medium |
```
