# Common Pitfalls

What to avoid when fine-tuning.

## Data Quality Pitfalls

### 1. Non-Representative Training Data

**Problem:** Training data doesn't match production traffic.

**Symptoms:**
- Great test metrics, poor production performance
- Model fails on common production inputs
- Distribution mismatch between train and prod

**Fix:**
- Sample training data from production logs
- Match class distribution to production
- Include edge cases from production

### 2. Class Imbalance

**Problem:** One class dominates the dataset.

**Symptoms:**
- Model always predicts majority class
- High accuracy but low recall on minority
- 95% accuracy but useless predictions

**Example:**
```
Training: 95% positive, 5% negative
Model: Predicts "positive" for everything
Accuracy: 95% (but wrong on all negatives)
```

**Fix:**
- Oversample minority class
- Undersample majority class
- Use class weights during training
- Stratified splitting

### 3. Label Inconsistency

**Problem:** Same inputs labeled differently.

**Symptoms:**
- High loss that won't decrease
- Model outputs random results
- Low inter-annotator agreement

**Fix:**
- Create clear labeling guidelines
- Review disagreements
- Deduplicate conflicting examples

### 4. Data Leakage

**Problem:** Test data influences training.

**Symptoms:**
- Perfect test metrics, poor production
- Overly optimistic evaluation
- Model memorized test set

**Sources:**
- Duplicates across train/test
- Preprocessing fit on full dataset
- Time-series random split (should be chronological)

**Fix:**
- Deduplicate before splitting
- Fit preprocessing on train only
- Use temporal splits for time data

## Training Pitfalls

### 5. Overfitting

**Problem:** Model memorizes training data.

**Symptoms:**
- Training loss decreases, validation loss increases
- Perfect training accuracy, poor test accuracy
- Model outputs exact training examples

**Fix:**
- Use validation set
- Early stopping
- Reduce epochs
- Add more diverse data

### 6. Underfitting

**Problem:** Model doesn't learn patterns.

**Symptoms:**
- High training and validation loss
- No improvement over base model
- Random-seeming outputs

**Fix:**
- Increase epochs
- Increase learning rate
- Check data quality
- Ensure task is learnable

### 7. Wrong Hyperparameters

**Problem:** Suboptimal training settings.

**Common mistakes:**
- Too many epochs (overfitting)
- Too few epochs (underfitting)
- Learning rate too high (unstable)
- Learning rate too low (slow/stuck)

**Fix:**
- Start with defaults
- Monitor training curves
- Adjust based on loss patterns

## Evaluation Pitfalls

### 8. Insufficient Evaluation

**Problem:** Testing doesn't catch issues.

**Symptoms:**
- Passed all tests, failed in production
- Missed edge cases
- Didn't test on realistic data

**Fix:**
- Use held-out test set
- Test on production-like data
- Include edge cases
- Human review sample

### 9. Wrong Metrics

**Problem:** Optimizing for wrong thing.

**Example:**
- Measuring accuracy when F1 matters
- Ignoring latency
- Not tracking cost

**Fix:**
- Define success metrics upfront
- Align metrics with business goals
- Track multiple metrics

### 10. Benchmark Contamination

**Problem:** Test data in pretraining.

**Symptoms:**
- Unrealistically high benchmark scores
- Scores don't match real-world performance

**Fix:**
- Build internal test sets
- Verify uniqueness vs public data
- Use production samples

## Deployment Pitfalls

### 11. No Baseline Comparison

**Problem:** Don't know if fine-tuning helped.

**Fix:**
- Always compare to base model
- A/B test in production
- Track before/after metrics

### 12. No Monitoring

**Problem:** Issues appear after deployment.

**Symptoms:**
- Quality degrades over time
- Costs spike unexpectedly
- New failure modes appear

**Fix:**
- Monitor latency, errors, costs
- Sample and review outputs
- Set up alerts

### 13. No Rollback Plan

**Problem:** Can't recover from bad deployment.

**Fix:**
- Keep base model available
- Version control models
- Gradual rollout (canary)

## Cost Pitfalls

### 14. Not Calculating ROI

**Problem:** Fine-tuning costs more than it saves.

**Questions to ask:**
- Training cost vs inference savings?
- How much volume to break even?
- Is prompting sufficient?

**Fix:**
- Calculate total cost (training + inference)
- Compare to base model cost
- Consider prompt engineering first

### 15. Token Waste

**Problem:** Inefficient data format.

**Symptoms:**
- High training costs
- High inference costs
- Context limit issues

**Fix:**
- Use TOON format for structured data
- Compress prompts
- Optimize output format

## Anti-Pattern Summary

| Pitfall | Detection | Fix |
|---------|-----------|-----|
| Non-representative data | Prod vs train distribution | Sample from prod logs |
| Class imbalance | Class frequency analysis | Rebalance |
| Label inconsistency | Inter-annotator agreement | Refine guidelines |
| Data leakage | Duplicate check | Split before dedup |
| Overfitting | Val loss increasing | Early stopping |
| Underfitting | Loss stays high | More epochs/data |
| Bad hyperparameters | Loss curve shape | Adjust systematically |
| Weak evaluation | Prod failures | More test coverage |
| Wrong metrics | Business mismatch | Align metrics |
| Benchmark contamination | Unrealistic scores | Use internal tests |
| No baseline | Unknown improvement | Always compare |
| No monitoring | Silent failures | Set up dashboards |
| No rollback | Stuck with bad model | Version control |
| No ROI calculation | Wasted money | Cost analysis |
| Token waste | High costs | Optimize format |

## Prevention Checklist

Before training:
- [ ] Data distribution matches production
- [ ] Classes are balanced (or addressed)
- [ ] Labels are consistent
- [ ] Train/test properly split
- [ ] Calculated expected cost

During training:
- [ ] Monitoring training curves
- [ ] Using validation set
- [ ] Hyperparameters sensible

Before deployment:
- [ ] Compared to baseline
- [ ] Tested on realistic data
- [ ] Human reviewed sample
- [ ] Rollback plan ready

After deployment:
- [ ] Monitoring active
- [ ] Sampling outputs
- [ ] Tracking costs
