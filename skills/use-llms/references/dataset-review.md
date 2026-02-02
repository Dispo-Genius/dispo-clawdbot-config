# Dataset Review (Core Focus)

Dataset quality is the most critical factor in fine-tuning success. Garbage in = garbage out.

## Why This Matters

- **Bias in training → bias in production** - Model learns your mistakes
- **Non-representative data → poor generalization** - Works in tests, fails in prod
- **Imbalanced classes → skewed predictions** - Majority class dominates
- **Low quality examples → confused model** - Learns the wrong patterns

## Review Workflow

```
1. Analyze Distribution → 2. Detect Bias → 3. Check Quality → 4. Sample Review → 5. Iterate
```

## 1. Distribution Analysis

### Class Balance

Check if classes are proportionally represented:

```bash
fine-tuner-cc analyze training.jsonl
# Output:
# Total examples: 1,000
# Class distribution:
#   positive: 850 (85%)
#   negative: 150 (15%)
# WARNING: Class imbalance detected (5.7:1 ratio)
```

**Rule of thumb:** Ratios > 3:1 require attention.

### Fixes for Imbalance

| Technique | When to Use |
|-----------|-------------|
| **Oversample minority** | Small dataset, need more data |
| **Undersample majority** | Large dataset, can afford to lose data |
| **Class weighting** | During training, not data prep |
| **Synthetic augmentation** | Use LLM to generate minority examples |
| **Stratified sampling** | Maintain proportions in splits |

### Token Distribution

```bash
fine-tuner-cc analyze training.jsonl --tokens
# Output:
# Token statistics:
#   Input: min=10, max=2000, avg=150, p95=500
#   Output: min=5, max=500, avg=50, p95=150
# Examples exceeding context: 3 (0.3%)
```

## 2. Bias Detection

### Types of Bias

| Bias Type | Description | Detection |
|-----------|-------------|-----------|
| **Selection bias** | Data not representative of production | Compare to production logs |
| **Label bias** | Inconsistent labeling | Inter-annotator agreement |
| **Recency bias** | Over-representation of recent data | Check date distribution |
| **Domain bias** | Missing edge cases | Coverage analysis |

### Production Alignment Check

**Critical:** Training data must match production traffic.

```
Production: 60% type A, 30% type B, 10% type C
Training:   80% type A, 15% type B, 5% type C
→ MISMATCH: Model will underperform on types B and C
```

**Fix:** Sample from production logs, maintain same distribution.

### Diversity Metrics

- **Distance-based**: How different are examples from each other?
- **Coverage-based**: Do examples cover the full input space?
- **Novelty-based**: Are there redundant/duplicate examples?

## 3. Quality Checks

### Automated Checks

```bash
fine-tuner-cc review training.jsonl
# Output:
# Quality report:
#   Format errors: 0
#   Empty responses: 2 (flag for removal)
#   Duplicate inputs: 15 (flag for review)
#   Suspicious patterns: 3
#     - Line 42: Response identical to input
#     - Line 156: Extremely short response (2 tokens)
#     - Line 789: Contains raw JSON in response
```

### Quality Signals

| Good | Bad |
|------|-----|
| Diverse inputs | Repetitive phrasing |
| Consistent output format | Inconsistent formatting |
| Complete responses | Truncated/partial outputs |
| Natural language | Template artifacts |
| Domain-appropriate | Out-of-domain examples |

### Inter-Annotator Agreement

If humans labeled the data:
1. Have multiple annotators label same examples
2. Calculate agreement rate
3. If low agreement → refine labeling guidelines

**Rule:** If humans can't agree, the model won't learn consistently.

## 4. Sampling for Human Review

You can't review 10,000 examples manually. Use stratified sampling:

```bash
fine-tuner-cc sample training.jsonl --n 100 --stratify class
# Output: sample_review.jsonl (100 examples, class-balanced)
```

### Review Checklist (per example)

- [ ] Input makes sense
- [ ] Output is correct
- [ ] Output format is consistent
- [ ] No hallucinations in output
- [ ] Appropriate length
- [ ] Would you want the model to produce this?

### LLM-Assisted Review

Use LLM-as-a-Judge for large-scale review (500x cheaper than human):

```bash
fine-tuner-cc review training.jsonl --llm-judge --rubric templates/evaluation-rubric.md
# Output:
# LLM Review (1,000 examples):
#   Pass: 920 (92%)
#   Fail: 80 (8%)
#   Flagged for human review: 80
```

## 5. Iteration

After review, iterate:

1. **Remove** flagged low-quality examples
2. **Fix** correctable issues
3. **Augment** underrepresented classes
4. **Re-analyze** distribution
5. **Re-sample** for another human review round

## Red Flags

Stop and investigate if you see:

| Red Flag | Action |
|----------|--------|
| >50% flagged by LLM-judge | Re-examine labeling process |
| Class imbalance >10:1 | Rebalance or use class weights |
| <80% inter-annotator agreement | Refine guidelines |
| Distribution mismatch vs prod | Sample from production logs |
| Duplicate rate >5% | Deduplicate |

## Tools

### Python Libraries

```python
# Class imbalance
from imblearn.over_sampling import RandomOverSampler

# Diversity metrics
from sklearn.metrics import pairwise_distances

# Quality checks
import jsonlines
```

### CLI Commands

```bash
fine-tuner-cc analyze <file>           # Distribution stats
fine-tuner-cc review <file>            # Automated quality checks
fine-tuner-cc review <file> --llm-judge # LLM-assisted review
fine-tuner-cc sample <file> --n 100    # Stratified sampling
fine-tuner-cc dedupe <file>            # Remove duplicates
```

## Traceability

Track everything:
- Dataset version
- Review date
- Reviewer (human or LLM)
- Changes made
- Metrics before/after

Link evaluation scores back to exact prompt/model/dataset versions.
