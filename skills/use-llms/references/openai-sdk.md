# OpenAI SDK Reference

**Last verified:** January 2026

## Environment Setup

```bash
# Environment variable (note: OPENAI_API_KEY, not OPENAI_KEY)
export OPENAI_API_KEY="sk-..."
```

## Async Client (Recommended)

```python
from openai import AsyncOpenAI

# Lazy initialization pattern - client created once, reused
_client: AsyncOpenAI | None = None

def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()  # Uses OPENAI_API_KEY env var
    return _client

async def call_llm(prompt: str, model: str = "gpt-4.1-mini") -> str:
    client = get_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content
```

## Structured Outputs

### JSON Schema Mode (Recommended)

```python
from pydantic import BaseModel
from openai import AsyncOpenAI

class ExtractedData(BaseModel):
    name: str
    confidence: float
    tags: list[str]

async def extract_structured(text: str) -> ExtractedData:
    client = AsyncOpenAI()
    response = await client.beta.chat.completions.parse(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": f"Extract: {text}"}],
        response_format=ExtractedData,
    )
    return response.choices[0].message.parsed
```

### JSON Object Mode (Legacy)

```python
# Use when you don't have a schema
response = await client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[{"role": "user", "content": "Return JSON: {\"key\": \"value\"}"}],
    response_format={"type": "json_object"},
)
data = json.loads(response.choices[0].message.content)
```

## Batch API

### File Format

```jsonl
{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4.1-mini", "messages": [{"role": "user", "content": "Hello"}]}}
{"custom_id": "req-2", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-4.1-mini", "messages": [{"role": "user", "content": "World"}]}}
```

### Full Workflow

```python
from openai import AsyncOpenAI
import asyncio

async def run_batch(input_file: str) -> str:
    client = AsyncOpenAI()

    # 1. Upload file
    with open(input_file, "rb") as f:
        file = await client.files.create(file=f, purpose="batch")

    # 2. Create batch
    batch = await client.batches.create(
        input_file_id=file.id,
        endpoint="/v1/chat/completions",
        completion_window="24h",
    )

    # 3. Poll for completion
    while batch.status not in ("completed", "failed", "cancelled"):
        await asyncio.sleep(60)
        batch = await client.batches.retrieve(batch.id)
        print(f"Status: {batch.status}, Progress: {batch.request_counts}")

    # 4. Download results
    if batch.status == "completed":
        result = await client.files.content(batch.output_file_id)
        return result.text
    else:
        raise RuntimeError(f"Batch failed: {batch.errors}")
```

### Batch Pricing

- 50% discount vs synchronous API
- 24-hour completion window
- Best for: >1000 requests, non-time-sensitive

## Rate Limiting Pattern

```python
import asyncio
from openai import AsyncOpenAI, RateLimitError

async def call_with_rate_limit(
    prompts: list[str],
    model: str = "gpt-4.1-mini",
    requests_per_second: float = 50.0,
) -> list[str]:
    """Fire at rate limit, not semaphore-based concurrency."""
    client = AsyncOpenAI()
    results = []
    delay = 1.0 / requests_per_second

    async def process_one(prompt: str) -> str:
        for attempt in range(3):
            try:
                response = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content
            except RateLimitError:
                await asyncio.sleep(2 ** attempt)
        raise RuntimeError("Max retries exceeded")

    tasks = []
    for i, prompt in enumerate(prompts):
        await asyncio.sleep(delay)
        tasks.append(asyncio.create_task(process_one(prompt)))

    return await asyncio.gather(*tasks)
```

## Error Handling

```python
from openai import (
    AsyncOpenAI,
    APIError,
    RateLimitError,
    APIConnectionError,
    AuthenticationError,
)

async def robust_call(prompt: str) -> str | None:
    client = AsyncOpenAI()
    try:
        response = await client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except AuthenticationError:
        print("Invalid API key")
        return None
    except RateLimitError as e:
        print(f"Rate limited, retry after: {e.response.headers.get('retry-after')}")
        return None
    except APIConnectionError:
        print("Network error")
        return None
    except APIError as e:
        print(f"API error: {e.status_code} - {e.message}")
        return None
```

## Fine-Tuned Models

```python
# Use fine-tuned model ID directly
response = await client.chat.completions.create(
    model="ft:gpt-4.1-mini-2025-04-14:dispo-genius:owner-v4:D2dpEnz3",
    messages=[{"role": "user", "content": prompt}],
)
```

## Common Patterns

### Token Counting (Before Request)

```python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4.1-mini") -> int:
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))
```

### Streaming

```python
async def stream_response(prompt: str):
    client = AsyncOpenAI()
    stream = await client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    async for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="")
```
