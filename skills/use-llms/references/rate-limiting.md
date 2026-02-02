# Rate Limiting vs Concurrency

Why rate-limited fire-and-forget beats semaphore-based concurrency for batch inference.

## The Problem with Semaphores

Semaphore-based concurrency limits concurrent requests, but response time gates throughput:

```typescript
// SLOW: Semaphore-based (common mistake)
const semaphore = new Semaphore(5);
await Promise.all(items.map(async item => {
  await semaphore.acquire();
  const result = await callAPI(item);  // Blocks until response
  semaphore.release();
  return result;
}));
```

**Result:** If each request takes 2-3 seconds, you get ~5 requests every 2-3 seconds = **1.5-2.5 req/sec**

## The Solution: Rate-Limited Fire-and-Forget

Fire requests at the rate limit regardless of response time:

```typescript
// FAST: Rate-limited fire-and-forget
const rateLimit = 5;  // req/sec
const delayMs = 1000 / rateLimit;

const promises: Promise<Response>[] = [];
for (const item of items) {
  promises.push(callAPI(item));  // Fire immediately
  await sleep(delayMs);          // Wait for next slot
}
const results = await Promise.all(promises);  // Collect all
```

**Result:** 5 requests per second sustained = **5 req/sec** (regardless of response time)

## Visual Comparison

```
Semaphore (5 concurrent, 2s response time):
|--req1--|
|--req2--|
|--req3--|
|--req4--|
|--req5--|
          |--req6--|
          |--req7--|
          ...

Rate-limited (5/sec, 2s response time):
|--req1--|
 |--req2--|
  |--req3--|
   |--req4--|
    |--req5--|
     |--req6--|
      |--req7--|
       ...
```

## Provider Rate Limits (Defaults)

| Provider | Default Rate | Delay | Notes |
|----------|--------------|-------|-------|
| Gemini | 60 req/sec | 17ms | Tier 3 (4000 RPM) |
| OpenAI | 100 req/sec | 10ms | |

### Gemini Rate Limits by Tier

| Tier | Requirement | RPM | RPS | CLI Flag |
|------|-------------|-----|-----|----------|
| Free | - | 15 | 0.25 | `--rate-limit 0.25` |
| Tier 1 | Billing enabled | 300 | 5 | `--rate-limit 5` |
| Tier 2 | $250 spend + 30 days | 1,000 | 16 | `--rate-limit 15` |
| **Tier 3** | Custom/Enterprise | 4,000+ | 60+ | (default) |

Check your tier: [Google AI Studio Usage](https://aistudio.google.com/usage?tab=rate-limit)

### Important: Project-Level Limits

Gemini rate limits are **per GCP project**, not per API key.

- All API keys in the same project share the quota
- Key rotation does NOT multiply your limit
- Multiple concurrent jobs share the same pool

**Parallel jobs:** Divide the rate limit:
```bash
# 2 jobs in parallel? Use 30 req/sec each
model-fine-tuner run batch1.jsonl --rate-limit 30 &
model-fine-tuner run batch2.jsonl --rate-limit 30 &
```

## When to Use Each Approach

| Approach | Use When |
|----------|----------|
| Rate-limited | Batch inference, distillation, bulk processing |
| Semaphore | Real-time APIs, interactive applications |
| Batch API | Very large jobs (>10K), cost optimization |

## Error Handling

With fire-and-forget, errors are collected separately:

```typescript
const outputs: BatchOutput[] = [];
const errors: BatchError[] = [];

const results = await Promise.all(promises);
for (const result of results) {
  if ('response' in result) outputs.push(result);
  else errors.push(result);
}
```

**Auto-retry pattern:**
- Attempt 1: immediate
- Attempt 2: 2s delay (exponential backoff)
- Attempt 3: 4s delay
- After 3 failures: write to errors.jsonl for manual retry

## Memory Considerations

Rate-limited approach holds more promises in memory. For very large datasets (>100K items):

1. Process in chunks of 10K
2. Write outputs incrementally
3. Consider Batch API for cost optimization (50% discount on OpenAI)

## CLI Usage

```bash
# Default rate (60 req/sec for Gemini Tier 3)
model-fine-tuner run input.jsonl --provider gemini --output output.jsonl

# Custom rate limit (for lower tiers or parallel jobs)
model-fine-tuner run input.jsonl --provider gemini --rate-limit 15 --output output.jsonl

# OpenAI (100 req/sec default)
model-fine-tuner run input.jsonl --provider openai --model gpt-5.2-instant --output output.jsonl

# With auto-detection
model-fine-tuner run input.jsonl --auto --output output.jsonl
```

The CLI handles rate limiting automatically. Use `--rate-limit` to override.
