# Model Selection Guide

Latest models as of January 2026.

## Quick Decision Tree

```
Complex reasoning needed? → GPT-5.2 Thinking or Gemini 3 Pro
Agentic/coding task? → Gemini 3 Flash (cheaper for long outputs)
Classification/extraction? → GPT-5.2 Instant (low hallucination, high throughput)
```

## Inference Models (Batch Processing)

**Each model has ONE purpose - no overlap:**

| Model | Use Case | Pricing (in/out per 1M) | Hallucination | Rate Limit |
|-------|----------|-------------------------|---------------|------------|
| **GPT-5.2 Instant** | Classification, extraction | $1.75 / $14 | Low (38% fewer than 5.1) | 100/sec |
| **GPT-5.2 Thinking** | Complex reasoning | $21 / $84 | Very low | 10/sec |
| **Gemini 3 Flash** | Agentic, coding, multi-turn | $0.50 / $3 | Medium | 5/sec |
| **Gemini 3 Pro** | Complex reasoning | $1.25 / $10 | Low | 2/sec |

### Why GPT-5.2 Instant for Classification

1. Lower hallucination rate (critical for structured outputs)
2. Higher rate limit (100 req/sec vs 5 req/sec)
3. Better for short, deterministic responses

### Why Gemini 3 Flash for Agentic/Coding

1. 78% SWE-bench (better than GPT-5.2 at code)
2. Cheaper for long outputs ($3/1M vs $14/1M)
3. Configurable thinking levels for complex tasks

## Fine-Tunable Models

### OpenAI

| Model | Model ID | Methods | Training Cost | Inference (Tuned) |
|-------|----------|---------|---------------|-------------------|
| **GPT-4.1** | `gpt-4.1-2025-04-14` | SFT, DPO, RFT | $25/M tokens | $3/M in, $12/M out |
| **GPT-4.1-mini** | `gpt-4.1-mini-2025-04-14` | SFT, DPO | Lower | Lower |
| **GPT-4.1-nano** | `gpt-4.1-nano-2025-04-14` | SFT, DPO | Lowest | Lowest |
| **o4-mini** | `o4-mini-2025-04-16` | RFT | $100/hr wall-clock | $4/M in, $16/M out |

**Training Methods:**
- **SFT (Supervised Fine-Tuning)**: Standard input/output pairs
- **DPO (Direct Preference Optimization)**: Preference pairs (chosen vs rejected)
- **RFT (Reinforcement Fine-Tuning)**: Reward-based training with graders

### Vertex AI (Google)

| Model | Fine-Tunable | Methods | Notes |
|-------|--------------|---------|-------|
| **Gemini 2.5 Pro** | Yes | Supervised, Preference | Highest quality |
| **Gemini 2.5 Flash** | Yes | Supervised, Preference | Balanced |
| **Gemini 2.5 Flash-Lite** | NO | - | Inference only |
| **Gemini 2.0 Flash** | Yes | Supervised | Legacy |

**Note:** Gemini API (consumer) deprecated fine-tuning May 2025. Use Vertex AI.

### Fine-Tuning Recommendations

| Use Case | Model |
|----------|-------|
| Cost-sensitive, high volume | GPT-4.1-nano |
| Balanced quality/cost | GPT-4.1-mini |
| Maximum quality | GPT-4.1 |
| Reasoning tasks | o4-mini (RFT) |

## Model Distillation Pattern

Transfer knowledge from teacher to student:

1. Generate outputs using teacher (GPT-5.2 Thinking, Gemini 3 Pro, Claude Opus 4.5)
2. Train student model on synthetic data
3. Deploy student at lower cost

### Teacher Model Selection

| Factor | Consider |
|--------|----------|
| Task accuracy | Test multiple models on your actual use case |
| Output format | Some models follow structured output better |
| Cost | Teacher runs once; student runs forever |
| Rate limit | Higher limit = faster distillation |

**Cost Tradeoff:**
```
Cheap teacher  → noisy outputs → review cycles → hidden labor cost
Quality teacher → clean outputs → minimal review → ship faster
```

### When to Distill

| Good For | Not Good For |
|----------|--------------|
| High volume inference | Low volume |
| Consistent, bounded tasks | Open-ended generation |
| Cost-sensitive production | Maximum capability needed |

## Pricing Reference

### OpenAI
- **Training**: $25/M tokens (GPT-4.1), lower for mini/nano
- **Inference (tuned)**: $3/M in, $12/M out (GPT-4.1)
- **o4-mini RFT**: $100/hr wall-clock

### Vertex AI
- **Training**: ~$20/hour compute + tokens
- **Inference**: Same as base model
- **Batch API**: 50% discount
- **Context Caching**: 90% discount (25% of standard)

**Note:** Batch and cache discounts do NOT stack.

## CLI Commands

```bash
# Check available models
model-fine-tuner models-available --provider openai
model-fine-tuner models-available --provider vertex
model-fine-tuner pricing

# Run batch inference
model-fine-tuner run input.jsonl --provider openai --model gpt-5.2-instant --output output.jsonl
model-fine-tuner run input.jsonl --provider gemini --model gemini-3-flash --output output.jsonl

# Auto-detect best model
model-fine-tuner run input.jsonl --auto --output output.jsonl
```

## Staying Current

Models change frequently. Web search: "OpenAI models 2026" / "Gemini 3 models 2026"
