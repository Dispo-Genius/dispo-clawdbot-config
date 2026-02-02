# Token Optimization

Reduce costs without sacrificing quality.

## Why Optimize Tokens?

| Impact | Savings |
|--------|---------|
| Training cost | Proportional to tokens |
| Inference cost | Per-token billing |
| Context limits | Fit more examples |
| Latency | Fewer tokens = faster |

## TOON Format

**Token-Oriented Object Notation** - JSON alternative with 40-60% fewer tokens.

### What is TOON?

Combines YAML (nested objects) and CSV (uniform arrays) layouts:

**JSON (11,842 tokens):**
```json
[
  {"id": 1, "name": "Product A", "price": 29.99, "category": "Electronics"},
  {"id": 2, "name": "Product B", "price": 19.99, "category": "Books"},
  {"id": 3, "name": "Product C", "price": 49.99, "category": "Electronics"}
]
```

**TOON (4,617 tokens = 61% reduction):**
```
id|name|price|category
1|Product A|29.99|Electronics
2|Product B|19.99|Books
3|Product C|49.99|Electronics
```

### When to Use TOON

| Good For | Not Ideal For |
|----------|---------------|
| Tabular data | Deeply nested objects |
| Uniform arrays | Non-uniform structures |
| Structured inputs | Free-form text |
| High-volume inference | One-off queries |

### Installation

```bash
npm install @toon-format/toon
```

### Usage

```typescript
import { toToon, fromToon } from '@toon-format/toon';

// Convert JSON to TOON
const toon = toToon(jsonData);

// Convert back to JSON
const json = fromToon(toonString);
```

### CLI Conversion

```bash
fine-tuner-cc convert data.json --to toon > data.toon
fine-tuner-cc convert data.toon --to json > data.json
```

### Benchmark Results

| Dataset | JSON Tokens | TOON Tokens | Reduction |
|---------|-------------|-------------|-----------|
| E-commerce (500 rows) | 11,842 | 4,617 | 61% |
| User profiles (1000 rows) | 24,500 | 10,200 | 58% |
| Transaction logs | 50,000 | 22,000 | 56% |

**Accuracy**: 99.4% on GPT-5 Nano (lossless conversion).

## Other Optimization Techniques

### 1. Prompt Compression

Remove unnecessary words while preserving meaning:

**Before (45 tokens):**
```
Please analyze the following customer review and determine whether the sentiment expressed is positive, negative, or neutral. Provide your answer in JSON format.
```

**After (20 tokens):**
```
Classify sentiment (positive/negative/neutral). Output JSON.
```

### 2. Example Selection

Use fewer, higher-quality examples instead of many mediocre ones:

- 100 curated examples often outperform 1000 noisy ones
- Remove near-duplicates
- Prioritize diverse, representative examples

### 3. Output Format Optimization

**Verbose (30 tokens):**
```json
{"sentiment": "positive", "confidence": 0.95, "reasoning": "Customer expressed satisfaction"}
```

**Compact (10 tokens):**
```
positive|0.95
```

### 4. Batch API Discounts

| Provider | Batch Discount | Notes |
|----------|----------------|-------|
| OpenAI | 50% | Async processing |
| Vertex AI | 50% | Batch predictions |
| Gemini API | 50% | Batch requests |

### 5. Context Caching (Gemini)

Cache repeated context for 90% discount:

```
Standard: $1.00/M tokens
Cached: $0.25/M tokens (75% savings)
```

**Use when:** Same system prompt or context across many requests.

**Note:** Batch and cache discounts do NOT stack.

## Cost Calculation

### Training Cost

```
Training cost = (tokens_per_example × num_examples × epochs) × price_per_M_tokens / 1,000,000
```

**Example (OpenAI GPT-4.1):**
```
150 tokens/example × 1000 examples × 3 epochs = 450,000 tokens
450,000 × $25/M = $11.25 training cost
```

### Inference Cost

```
Monthly cost = (input_tokens + output_tokens) × requests_per_month × price_per_M_tokens / 1,000,000
```

### CLI Cost Estimator

```bash
fine-tuner-cc estimate training.jsonl --provider openai --epochs 3
# Output:
# Training estimate:
#   Total tokens: 450,000
#   Training cost: $11.25 (GPT-4.1)
#
# Inference estimate (1M requests/month):
#   Input: 150M tokens × $3/M = $450
#   Output: 50M tokens × $12/M = $600
#   Monthly inference: $1,050
```

## Optimization Checklist

- [ ] Use TOON for structured data
- [ ] Remove unnecessary prompt words
- [ ] Compact output formats
- [ ] Deduplicate training data
- [ ] Use batch API for non-realtime
- [ ] Enable context caching for repeated prompts
- [ ] Calculate costs before training

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Over-compress prompts | Confuses model, worse results |
| Remove critical context | Model hallucinates |
| Optimize prematurely | Measure first |
| Focus only on input | Output often dominates cost |
| Use lossy compression | Removes important information |
