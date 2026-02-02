# End-to-End Fine-Tuning Workflow

Complete workflow from raw data to production deployment.

## Overview

```
Week 1: Data Preparation
Week 2: Training
Week 3: Evaluation
Week 4: Deployment
```

## Phase 1: Data Preparation

### Day 1-2: Collect Data

**Option A: Sample from production logs**
```bash
# Extract prompts and responses from logs
python scripts/extract_training_data.py \
  --logs production_logs/ \
  --output raw_data.jsonl \
  --sample 5000
```

**Option B: Generate synthetic data**
```bash
# Use teacher model to generate examples
fine-tuner-cc generate-synthetic \
  --prompts prompts.txt \
  --model gpt-4.1 \
  --output synthetic_data.jsonl
```

### Day 3: Format Data

```bash
# Convert to provider format
fine-tuner-cc convert raw_data.jsonl \
  --to openai \
  --output training.jsonl

# Validate format
fine-tuner-cc validate training.jsonl --provider openai
```

### Day 4: Analyze Distribution

```bash
fine-tuner-cc analyze training.jsonl
# Check:
# - Class balance
# - Token distribution
# - Duplicates
```

### Day 5: Review Quality

```bash
# Automated quality check
fine-tuner-cc review training.jsonl

# LLM-assisted review
fine-tuner-cc review training.jsonl --llm-judge

# Sample for human review
fine-tuner-cc sample training.jsonl --n 100 --stratify class
# Manually review sample_review.jsonl
```

### Day 6-7: Iterate

- Fix quality issues
- Rebalance classes if needed
- Remove bad examples
- Re-analyze and re-review

### Checkpoint: Data Ready

- [ ] Format validated
- [ ] Distribution acceptable
- [ ] Quality checks passed
- [ ] Human sample reviewed
- [ ] Split into train/val/test

```bash
fine-tuner-cc split training.jsonl --train 80 --val 10 --test 10
```

---

## Phase 2: Training

### Day 8: Upload Data

**OpenAI:**
```bash
fine-tuner-cc upload training_train.jsonl --provider openai
# Output: file-abc123

fine-tuner-cc upload training_val.jsonl --provider openai
# Output: file-def456
```

**Vertex AI:**
```bash
gsutil cp training_train.jsonl gs://my-bucket/fine-tune/
gsutil cp training_val.jsonl gs://my-bucket/fine-tune/
```

### Day 9: Create Training Job

**OpenAI:**
```bash
fine-tuner-cc create file-abc123 \
  --provider openai \
  --model gpt-4.1-nano-2025-04-14 \
  --validation-file file-def456 \
  --epochs 3
# Output: ftjob-xyz789
```

**Vertex AI:**
```bash
fine-tuner-cc create gs://my-bucket/fine-tune/training_train.jsonl \
  --provider vertex \
  --model gemini-2.5-flash \
  --validation gs://my-bucket/fine-tune/training_val.jsonl
```

### Day 10-12: Monitor Training

```bash
# Check status
fine-tuner-cc status ftjob-xyz789

# Watch for:
# - Training loss decreasing
# - Validation loss decreasing (not increasing!)
# - No errors or warnings
```

### Day 13: Review Checkpoints

```bash
fine-tuner-cc checkpoints ftjob-xyz789

# If validation loss started increasing:
# Use earlier checkpoint instead of final model
```

### Checkpoint: Training Complete

- [ ] Job succeeded
- [ ] Training loss decreased
- [ ] Validation loss acceptable
- [ ] No overfitting detected

---

## Phase 3: Evaluation

### Day 14: Get Model ID

```bash
fine-tuner-cc status ftjob-xyz789
# Output: fine_tuned_model: ft:gpt-4.1-nano-2025-04-14:org::abc123
```

### Day 15: Regression Testing

```bash
# Test on standard benchmarks
fine-tuner-cc benchmark ft:gpt-4.1-nano:org::abc123 --benchmark gsm8k

# Compare to base model
fine-tuner-cc benchmark gpt-4.1-nano --benchmark gsm8k

# Acceptable: <5% regression
```

### Day 16: Custom Evaluation

```bash
# Evaluate on held-out test set
fine-tuner-cc evaluate ft:gpt-4.1-nano:org::abc123 training_test.jsonl

# Output:
# Accuracy: 94.5%
# Precision: 0.93
# Recall: 0.95
# F1: 0.94
```

### Day 17: Compare to Baseline

```bash
fine-tuner-cc compare \
  gpt-4.1-nano \
  ft:gpt-4.1-nano:org::abc123 \
  training_test.jsonl

# Output:
# Base: 78% accuracy
# Tuned: 94.5% accuracy
# Improvement: +16.5%
```

### Day 18: LLM-as-Judge

```bash
fine-tuner-cc evaluate ft:gpt-4.1-nano:org::abc123 training_test.jsonl \
  --llm-judge \
  --rubric templates/evaluation-rubric.md

# Review flagged examples manually
```

### Day 19-20: Human Review

- Review LLM-flagged examples
- Spot-check passing examples
- Document any issues found

### Checkpoint: Evaluation Complete

- [ ] Regression < 5%
- [ ] Custom metrics meet threshold
- [ ] LLM-judge pass rate > 90%
- [ ] Human review approved
- [ ] Improvement over baseline confirmed

---

## Phase 4: Deployment

### Day 21: Staging Deployment

```bash
# Deploy to staging environment
# Test with real-ish traffic
# Monitor for issues
```

### Day 22-24: Shadow Deployment

```python
# Production still uses base model
# Shadow uses fine-tuned (log only, don't return)

def process_request(prompt):
    # Production response
    prod_response = call_model("gpt-4.1-nano", prompt)

    # Shadow response (async, logged only)
    shadow_response = call_model("ft:gpt-4.1-nano:org::abc123", prompt)
    log_shadow_comparison(prompt, prod_response, shadow_response)

    return prod_response
```

### Day 25: A/B Test Setup

```python
# Split traffic 50/50
if user_id % 2 == 0:
    model = "ft:gpt-4.1-nano:org::abc123"
else:
    model = "gpt-4.1-nano"
```

### Day 26-27: Monitor A/B

Track:
- Accuracy/quality metrics
- Latency p50, p95, p99
- Error rates
- Cost per request

### Day 28: Decision

If metrics positive:
```bash
# Ramp to 100%
# Update model config
# Keep base model available for rollback
```

If metrics negative:
```bash
# Rollback to base
# Investigate issues
# Iterate on training data
```

### Checkpoint: Deployment Complete

- [ ] Shadow deployment successful
- [ ] A/B test positive
- [ ] Monitoring in place
- [ ] Rollback plan documented
- [ ] Team notified

---

## Post-Deployment

### Week 5+: Ongoing

**Weekly:**
- Sample 100 production outputs for review
- Check metrics dashboard
- Review error logs

**Monthly:**
- Full evaluation on fresh data
- Check for distribution drift
- Consider retraining if quality drops

**Document:**
- Training data version
- Model version
- Evaluation results
- Deployment date
- Any issues found

---

## Quick Reference Checklist

### Before Training
- [ ] Data formatted correctly
- [ ] Data distribution analyzed
- [ ] Quality reviewed
- [ ] Split into train/val/test

### Before Deployment
- [ ] Regression tested
- [ ] Custom metrics passed
- [ ] LLM-judge passed
- [ ] Human reviewed
- [ ] Baseline comparison done

### After Deployment
- [ ] Monitoring active
- [ ] Rollback plan ready
- [ ] A/B test positive
- [ ] Documentation complete
