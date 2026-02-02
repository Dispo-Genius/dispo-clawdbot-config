# Evaluation Methodology

How to properly evaluate fine-tuned models.

## Evaluation Strategy

```
1. Regression Testing → 2. Custom Metrics → 3. LLM-as-a-Judge → 4. Human Review → 5. Production Monitoring
```

## 1. Regression Testing

**Purpose:** Ensure base model capabilities haven't degraded.

### Standard Benchmarks

| Benchmark | Tests | When to Use |
|-----------|-------|-------------|
| GSM8K | Math reasoning | Reasoning tasks |
| SQuAD | Reading comprehension | Q&A tasks |
| GLUE/SuperGLUE | NLU tasks | General language |
| HumanEval | Code generation | Coding tasks |

### How to Run

```bash
# Compare base vs fine-tuned on benchmark
fine-tuner-cc benchmark ft:gpt-4.1-nano:org::abc123 --benchmark gsm8k

# Output:
# Base model: 72.5%
# Fine-tuned: 71.8%
# Regression: -0.7% (acceptable)
```

**Rule:** Regression > 5% = investigate before deploying.

## 2. Custom Metrics

**Purpose:** Measure performance on YOUR specific task.

### Classification Metrics

```python
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

accuracy = accuracy_score(y_true, y_pred)
precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted')
```

### Generative Metrics

| Metric | Measures | Tools |
|--------|----------|-------|
| BLEU | Text similarity | `sacrebleu` |
| ROUGE | Summary quality | `rouge_score` |
| Perplexity | Language model quality | Built-in |
| Exact match | Structured output accuracy | Custom |

### CLI Evaluation

```bash
fine-tuner-cc evaluate ft:gpt-4.1-nano:org::abc123 test.jsonl
# Output:
# Accuracy: 94.5%
# Precision: 0.93
# Recall: 0.95
# F1: 0.94
# Exact match: 89.2%
```

## 3. LLM-as-a-Judge

**Purpose:** Scale evaluation beyond what humans can review.

### How It Works

1. Define evaluation rubric
2. LLM grades model outputs against rubric
3. Aggregate scores
4. Flag low-scoring examples for human review

### Cost Comparison

| Method | Cost per 1000 examples | Time |
|--------|------------------------|------|
| Human review | $500-2000 | Days |
| LLM-as-Judge | $1-10 | Minutes |
| Ratio | 500x-5000x cheaper | Much faster |

### Agreement with Humans

LLM-as-Judge achieves ~80% agreement with human preferences when rubric is clear.

### CLI Usage

```bash
fine-tuner-cc evaluate ft:gpt-4.1-nano:org::abc123 test.jsonl \
  --llm-judge \
  --rubric templates/evaluation-rubric.md

# Output:
# LLM Judge Results:
#   Excellent: 450 (45%)
#   Good: 380 (38%)
#   Acceptable: 120 (12%)
#   Poor: 50 (5%)
#
# Flagged for human review: 50 examples
# Saved to: flagged_for_review.jsonl
```

### Rubric Design

See [Evaluation Rubric Template](../templates/evaluation-rubric.md).

Key principles:
- Be specific about criteria
- Use numbered scales (1-5)
- Include examples for each score
- Test rubric on humans first

## 4. Human Review

**Purpose:** Validate LLM judgments and catch edge cases.

### When to Use

- Final validation before deployment
- Review flagged examples from LLM-judge
- Calibrate LLM-judge rubric
- High-stakes applications

### Sampling Strategy

Don't review everything. Use stratified sampling:

```bash
fine-tuner-cc sample flagged_for_review.jsonl --n 50 --stratify error_type
```

### Review Checklist

For each example:
- [ ] Output is factually correct
- [ ] Output follows expected format
- [ ] No hallucinations
- [ ] Appropriate tone/style
- [ ] Would deploy this in production?

### Inter-Annotator Agreement

If multiple reviewers:
1. Have 2+ people review same 50 examples
2. Calculate agreement rate
3. If < 80% agreement, refine rubric

## 5. Production Monitoring

**Purpose:** Catch issues that appear only in production.

### Metrics to Track

| Metric | What to Watch |
|--------|---------------|
| Latency | p50, p95, p99 |
| Error rate | 4xx, 5xx, timeouts |
| Token usage | Input/output distribution |
| Output quality | Sample and review |

### A/B Testing

Compare fine-tuned vs base model:

```python
# 50/50 split traffic
if user_id % 2 == 0:
    model = "ft:gpt-4.1-nano:org::abc123"
else:
    model = "gpt-4.1-nano"

# Track metrics per variant
```

### Shadow Deployment

Run fine-tuned model alongside base, compare outputs:

```python
# Production uses base
base_response = call_model("gpt-4.1-nano", prompt)

# Shadow uses fine-tuned (don't return to user)
shadow_response = call_model("ft:gpt-4.1-nano:org::abc123", prompt)

# Log both for comparison
log_comparison(prompt, base_response, shadow_response)
```

### Drift Detection

Monitor for distribution shift:
- Input distribution changing?
- Output quality degrading?
- New edge cases appearing?

Re-evaluate monthly or when metrics degrade.

## Evaluation Workflow

### Pre-Deployment

1. ✅ Regression test (< 5% drop)
2. ✅ Custom metrics (meet threshold)
3. ✅ LLM-as-Judge (> 90% pass)
4. ✅ Human review (sample validation)

### Post-Deployment

1. ✅ A/B test (2+ weeks)
2. ✅ Monitor metrics (continuous)
3. ✅ Sample review (weekly)
4. ✅ Drift detection (monthly)

## Tools

### CLI Commands

```bash
fine-tuner-cc evaluate <model> <test-file>              # Custom metrics
fine-tuner-cc evaluate <model> <test-file> --llm-judge  # LLM-as-Judge
fine-tuner-cc compare <base> <tuned> <test-file>        # Side-by-side
fine-tuner-cc benchmark <model> --benchmark gsm8k       # Standard benchmark
```

### Python Libraries

```python
# Metrics
from sklearn.metrics import classification_report
from rouge_score import rouge_scorer
import sacrebleu

# LLM-as-Judge
from langchain.evaluation import load_evaluator
```
