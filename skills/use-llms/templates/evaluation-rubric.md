# Evaluation Rubric Template

Use this template for LLM-as-a-Judge evaluation.

## Rubric Structure

```markdown
# Evaluation Rubric: [Task Name]

## Task Description
[Describe what the model should do]

## Evaluation Criteria

### Criterion 1: [Name]
**Weight:** [percentage]

| Score | Description | Example |
|-------|-------------|---------|
| 5 | Excellent | [specific example] |
| 4 | Good | [specific example] |
| 3 | Acceptable | [specific example] |
| 2 | Poor | [specific example] |
| 1 | Unacceptable | [specific example] |

### Criterion 2: [Name]
[repeat structure]

## Overall Score
Calculate weighted average of criteria scores.

## Pass/Fail Threshold
- Pass: Overall score >= 3.5
- Fail: Overall score < 3.5
```

---

## Example: Sentiment Classification Rubric

# Evaluation Rubric: Sentiment Classification

## Task Description
Classify text sentiment as positive, negative, or neutral.

## Evaluation Criteria

### Criterion 1: Correctness
**Weight:** 70%

| Score | Description | Example |
|-------|-------------|---------|
| 5 | Exactly correct classification | Input: "Love it!" → Output: "positive" |
| 3 | Reasonable but not optimal | Input: "It's fine" → Output: "positive" (should be neutral) |
| 1 | Clearly wrong | Input: "Terrible!" → Output: "positive" |

### Criterion 2: Format
**Weight:** 30%

| Score | Description | Example |
|-------|-------------|---------|
| 5 | Exactly one word, lowercase | "positive" |
| 3 | Correct but wrong format | "Positive" or "The sentiment is positive" |
| 1 | Invalid format | "I think this is positive because..." |

## Overall Score
`0.7 * Correctness + 0.3 * Format`

## Pass/Fail Threshold
- Pass: Overall score >= 4.0
- Fail: Overall score < 4.0

---

## Example: Entity Extraction Rubric

# Evaluation Rubric: Entity Extraction

## Task Description
Extract named entities (people, organizations, locations) from text.

## Evaluation Criteria

### Criterion 1: Recall
**Weight:** 40%

| Score | Description |
|-------|-------------|
| 5 | All entities found |
| 4 | 80%+ entities found |
| 3 | 60%+ entities found |
| 2 | 40%+ entities found |
| 1 | <40% entities found |

### Criterion 2: Precision
**Weight:** 40%

| Score | Description |
|-------|-------------|
| 5 | No false positives |
| 4 | 1 false positive |
| 3 | 2-3 false positives |
| 2 | 4-5 false positives |
| 1 | >5 false positives |

### Criterion 3: Classification
**Weight:** 20%

| Score | Description |
|-------|-------------|
| 5 | All entity types correct |
| 3 | Some entity types wrong |
| 1 | Most entity types wrong |

---

## LLM-as-Judge Prompt Template

```
You are evaluating a model's output for [task name].

## Input
{input}

## Expected Output
{expected}

## Actual Output
{actual}

## Rubric
[paste rubric here]

## Instructions
1. Score each criterion (1-5)
2. Calculate overall score
3. Determine pass/fail
4. Provide brief justification

## Response Format
```json
{
  "scores": {
    "criterion_1": [score],
    "criterion_2": [score]
  },
  "overall": [weighted average],
  "pass": [true/false],
  "justification": "[brief explanation]"
}
```
```

---

## CLI Usage

```bash
# Run LLM-as-Judge with rubric
fine-tuner-cc evaluate model_id test.jsonl \
  --llm-judge \
  --rubric path/to/rubric.md

# Output includes pass/fail per example and aggregates
```

---

## Best Practices

1. **Be specific** - Vague criteria lead to inconsistent scoring
2. **Include examples** - Each score level needs concrete example
3. **Test on humans first** - If humans can't agree, LLM won't either
4. **Weight appropriately** - Most important criteria get highest weight
5. **Set realistic thresholds** - 100% pass rate means threshold too low
