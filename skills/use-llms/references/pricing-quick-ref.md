# Pricing Quick Reference

**Last verified:** January 2026

## Inference Pricing (per 1M tokens)

### OpenAI

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| GPT-5.2 Instant | $0.10 | $0.40 | Fast, high rate limit |
| GPT-5.2 Thinking | $3.00 | $15.00 | Extended thinking |
| GPT-4.1 | $2.00 | $8.00 | Balanced |
| GPT-4.1-mini | $0.40 | $1.60 | Cost-effective |
| GPT-4.1-nano | $0.10 | $0.40 | Cheapest |

### Gemini (Vertex AI)

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Gemini 3 Pro | $1.25 | $5.00 | Best reasoning |
| Gemini 3 Flash | $0.075 | $0.30 | Fast, cheap |
| Gemini 2.5 Flash | $0.075 | $0.30 | Fine-tunable |
| Gemini 2.5 Pro | $1.25 | $5.00 | Fine-tunable |

### Anthropic

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| Claude Opus 4.5 | $15.00 | $75.00 | Most capable |
| Claude Sonnet 4 | $3.00 | $15.00 | Balanced |
| Claude Haiku 3.5 | $0.80 | $4.00 | Fast |

## Fine-Tuning Costs

### OpenAI

| Model | Training (per 1M tokens) | Inference Multiplier |
|-------|--------------------------|---------------------|
| GPT-4.1 | $25.00 | 1x base price |
| GPT-4.1-mini | $3.00 | 1x base price |
| GPT-4.1-nano | $1.00 | 1x base price |

### Vertex AI

| Model | Training (per 1M tokens) | Inference Multiplier |
|-------|--------------------------|---------------------|
| Gemini 2.5 Flash | $2.00 | ~1.5x base |
| Gemini 2.5 Pro | $10.00 | ~1.5x base |

## Discounts

| Type | Discount | Provider |
|------|----------|----------|
| Batch API | 50% | OpenAI, Anthropic |
| Context Caching | 90% (cached tokens) | Vertex AI |
| Prompt Caching | 90% (cached tokens) | Anthropic |

## Rate Limits (requests/second)

| Provider | Tier 1 | Tier 4+ |
|----------|--------|---------|
| OpenAI GPT-5.2 Instant | 20 | 100 |
| OpenAI GPT-4.1 | 10 | 50 |
| Gemini Flash | 2 | 10 |
| Gemini Pro | 1 | 5 |
| Claude Sonnet | 5 | 20 |
| Claude Haiku | 10 | 50 |

## Cost Estimation Formula

```python
def estimate_cost(
    input_tokens: int,
    output_tokens: int,
    input_price_per_m: float,
    output_price_per_m: float,
    num_requests: int = 1,
    batch_discount: float = 1.0,  # 0.5 for batch API
) -> float:
    """Estimate total cost in dollars."""
    input_cost = (input_tokens / 1_000_000) * input_price_per_m
    output_cost = (output_tokens / 1_000_000) * output_price_per_m
    return (input_cost + output_cost) * num_requests * batch_discount

# Example: 1000 requests, 500 input tokens, 200 output tokens each
# Using GPT-4.1-mini ($0.40/$1.60 per 1M)
cost = estimate_cost(
    input_tokens=500,
    output_tokens=200,
    input_price_per_m=0.40,
    output_price_per_m=1.60,
    num_requests=1000,
)
# = ($0.0002 + $0.00032) * 1000 = $0.52
```

## Model Selection by Use Case

| Use Case | Recommended | Cost/1K requests |
|----------|-------------|------------------|
| Classification | GPT-5.2 Instant | $0.05 |
| Entity extraction | GPT-4.1-mini | $0.30 |
| Code generation | Gemini 3 Flash | $0.04 |
| Complex reasoning | Claude Sonnet 4 | $1.80 |
| Bulk processing | GPT-5.2 Instant + Batch | $0.025 |

## Quick Decision Tree

```
Need fine-tuning?
├── Yes → OpenAI GPT-4.1-mini or Vertex Gemini 2.5 Flash
└── No
    ├── Complex reasoning? → Claude Sonnet 4 or GPT-5.2 Thinking
    ├── Code/agentic? → Gemini 3 Flash
    ├── Classification/extraction? → GPT-5.2 Instant
    └── Bulk processing? → GPT-5.2 Instant + Batch API (50% off)
```
