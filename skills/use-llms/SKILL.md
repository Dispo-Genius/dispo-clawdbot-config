---
name: use-llms
description: End-to-end LLM workflows including fine-tuning, batch inference, and SDK usage patterns. Triggers on "fine-tune", "fine tuning", "training data", "model distillation", "upload dataset", "evaluate model", "prepare dataset", "openai sdk", "gemini sdk", "anthropic sdk", "how to call", "async client", "structured output", "json schema", "batch api".
---

# Use LLMs

End-to-end workflow for fine-tuning LLMs, batch inference, and SDK usage patterns across OpenAI, Gemini, and Anthropic.

## When to Use

- Writing Python code that calls LLM APIs
- Preparing datasets for fine-tuning
- Validating and reviewing training data quality
- Running rate-limited batch inference (distillation, bulk processing)
- Uploading datasets to providers
- Creating and monitoring fine-tune jobs
- Evaluating fine-tuned models
- Comparing model performance

## Quick Reference

### SDK Patterns

See [references/openai-sdk.md](references/openai-sdk.md), [references/gemini-sdk.md](references/gemini-sdk.md), [references/anthropic-sdk.md](references/anthropic-sdk.md) for code patterns.

See [references/pricing-quick-ref.md](references/pricing-quick-ref.md) for all provider pricing and rate limits.

### Batch Inference (CLI Tool)

```bash
# Classification task (GPT-5.2 Instant - low hallucination, high rate limit)
model-fine-tuning run input.jsonl --provider openai --model gpt-5.2-instant --output output.jsonl

# Agentic/coding task (Gemini 3 Flash - better at reasoning)
model-fine-tuning run input.jsonl --provider gemini --model gemini-3-flash --output output.jsonl

# Auto-detect best model for task
model-fine-tuning run input.jsonl --auto --output output.jsonl

# With delegated review after completion
model-fine-tuning run input.jsonl --provider openai --model gpt-5.2-instant --output output.jsonl --review

# Dry run (validate input without API calls)
model-fine-tuning run input.jsonl --dry-run
```

**Input format:** OpenAI chat format (JSONL)
```jsonl
{"id": "1", "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]}
```

### Data Preparation

```bash
model-fine-tuning validate <file> --provider openai
model-fine-tuning analyze <file> --tokens
model-fine-tuning review <file> --delegate
model-fine-tuning split <file> --train 80 --val 10 --test 10
```

### Job Management

```bash
model-fine-tuning upload <file> --provider openai
model-fine-tuning create <dataset-id> --provider openai
model-fine-tuning status <job-id>
model-fine-tuning list --provider openai
```

### Evaluation

```bash
model-fine-tuning evaluate <model-id> <test-file>
model-fine-tuning compare <model-a> <model-b> <test-file>
```

### Info

```bash
model-fine-tuning models-available --provider openai
model-fine-tuning pricing
model-fine-tuning help-workflow
```

## Model Selection (January 2026)

### For Batch Inference

| Model | Use Case | Rate Limit |
|-------|----------|------------|
| **GPT-5.2 Instant** | Classification, extraction | 100/sec |
| **GPT-5.2 Thinking** | Complex reasoning | 10/sec |
| **Gemini 3 Flash** | Agentic, coding, multi-turn | 5/sec |
| **Gemini 3 Pro** | Complex reasoning | 2/sec |

**Decision tree:**
```
Complex reasoning? → GPT-5.2 Thinking or Gemini 3 Pro
Agentic/coding? → Gemini 3 Flash
Classification/extraction? → GPT-5.2 Instant
```

### For Fine-Tuning

| Provider | Models | Methods |
|----------|--------|---------|
| **OpenAI** | GPT-4.1, GPT-4.1-mini, GPT-4.1-nano | SFT, DPO, RFT |
| **Vertex AI** | Gemini 2.5 Pro, Gemini 2.5 Flash | Supervised only |

**Warning:** Gemini 2.5 Flash-Lite is NOT fine-tunable.

## Methodology (5 Phases)

### Phase 1: Data Preparation
Validate format, analyze distribution, ensure production alignment.

### Phase 2: Dataset Review (Critical)
Bias detection, quality metrics, stratified sampling for human review.

### Phase 3: Upload & Train
Provider-specific ingestion, job submission, progress monitoring.

### Phase 4: Evaluate
Regression testing, custom metrics, LLM-as-a-Judge, human review.

### Phase 5: Deploy
Promote model, document results, monitor production performance.

## Best Practices

1. **Quality over quantity** - 100 high-quality examples > 1000 noisy ones
2. **Production alignment** - Training data must match production traffic exactly
3. **Dataset review is critical** - Bias detection before training prevents disasters
4. **Use rate-limited inference** - Fire at rate limit, not semaphore-based concurrency
5. **LLM-as-a-Judge** - 500x cheaper than human review, 80% agreement

## References

### SDK Patterns (NEW)
- [OpenAI SDK](references/openai-sdk.md) - AsyncOpenAI, structured outputs, batch API
- [Gemini SDK](references/gemini-sdk.md) - Vertex AI, context caching, format conversion
- [Anthropic SDK](references/anthropic-sdk.md) - Tool use, streaming, message batching
- [Pricing Quick Reference](references/pricing-quick-ref.md) - All providers pricing/limits

### Fine-Tuning Workflows
- [Model Selection](references/model-selection.md) - GPT-5.2, Gemini 3, fine-tunable models
- [Rate Limiting](references/rate-limiting.md) - Why rate-limit beats concurrency
- [Data Preparation](references/data-preparation.md) - Format specs for each provider
- [Dataset Review](references/dataset-review.md) - Bias detection, quality metrics
- [Token Optimization](references/token-optimization.md) - TOON format, cost savings
- [OpenAI Workflow](references/openai-workflow.md) - GPT-4.1 fine-tuning guide
- [Vertex AI Workflow](references/vertex-ai-workflow.md) - Gemini fine-tuning guide
- [Evaluation](references/evaluation.md) - LLM-as-a-Judge, regression testing
- [Common Pitfalls](references/common-pitfalls.md) - What to avoid

## Templates

- [Batch Input Format](templates/batch-input.jsonl) - Example for `run` command
- [OpenAI Chat Format](templates/openai-chat.jsonl) - Example training data
- [Vertex AI Format](templates/vertex-tuning.jsonl) - Example training data
- [Evaluation Rubric](templates/evaluation-rubric.md) - LLM-as-a-Judge template
