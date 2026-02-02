# Anthropic SDK Reference

**Last verified:** January 2026

## Environment Setup

```bash
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Async Client

```python
from anthropic import AsyncAnthropic

# Lazy initialization
_client: AsyncAnthropic | None = None

def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic()  # Uses ANTHROPIC_API_KEY env var
    return _client

async def call_claude(prompt: str, model: str = "claude-sonnet-4-20250514") -> str:
    client = get_client()
    response = await client.messages.create(
        model=model,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

## Available Models (January 2026)

| Model | ID | Use Case |
|-------|-----|----------|
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | Complex reasoning, analysis |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | Balanced performance |
| Claude Haiku 3.5 | `claude-3-5-haiku-20241022` | Fast, cost-effective |

## Tool Use

```python
from anthropic import AsyncAnthropic

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"},
            },
            "required": ["location"],
        },
    }
]

async def call_with_tools(prompt: str) -> dict:
    client = AsyncAnthropic()
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        tools=tools,
        messages=[{"role": "user", "content": prompt}],
    )

    # Check if tool use requested
    for block in response.content:
        if block.type == "tool_use":
            return {
                "tool": block.name,
                "input": block.input,
                "tool_use_id": block.id,
            }

    return {"text": response.content[0].text}


async def continue_with_tool_result(
    messages: list,
    tool_use_id: str,
    result: str,
) -> str:
    """Send tool result back to Claude."""
    client = AsyncAnthropic()

    messages.append({
        "role": "user",
        "content": [{
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": result,
        }],
    })

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        tools=tools,
        messages=messages,
    )
    return response.content[0].text
```

## Streaming

```python
from anthropic import AsyncAnthropic

async def stream_response(prompt: str):
    client = AsyncAnthropic()

    async with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            print(text, end="", flush=True)
```

## Message Batches API

```python
from anthropic import AsyncAnthropic

async def create_batch(requests: list[dict]) -> str:
    """Submit batch of requests."""
    client = AsyncAnthropic()

    batch = await client.messages.batches.create(
        requests=[
            {
                "custom_id": req["id"],
                "params": {
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "messages": req["messages"],
                },
            }
            for req in requests
        ]
    )
    return batch.id


async def get_batch_results(batch_id: str) -> list[dict]:
    """Poll and retrieve batch results."""
    client = AsyncAnthropic()

    while True:
        batch = await client.messages.batches.retrieve(batch_id)
        if batch.processing_status == "ended":
            break
        await asyncio.sleep(60)

    results = []
    async for result in await client.messages.batches.results(batch_id):
        results.append({
            "id": result.custom_id,
            "content": result.result.message.content[0].text,
        })
    return results
```

**Batch pricing:** 50% discount, 24-hour window

## System Prompts

```python
async def call_with_system(prompt: str, system: str) -> str:
    client = AsyncAnthropic()
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system,  # System prompt is a top-level parameter
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

## Rate Limiting

```python
import asyncio
from anthropic import AsyncAnthropic, RateLimitError

async def call_with_rate_limit(
    prompts: list[str],
    requests_per_second: float = 10.0,
) -> list[str]:
    client = AsyncAnthropic()
    delay = 1.0 / requests_per_second

    async def process_one(prompt: str) -> str:
        for attempt in range(3):
            try:
                response = await client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.content[0].text
            except RateLimitError:
                await asyncio.sleep(2 ** attempt)
        raise RuntimeError("Max retries exceeded")

    tasks = []
    for prompt in prompts:
        await asyncio.sleep(delay)
        tasks.append(asyncio.create_task(process_one(prompt)))

    return await asyncio.gather(*tasks)
```

## Error Handling

```python
from anthropic import (
    AsyncAnthropic,
    APIError,
    RateLimitError,
    APIConnectionError,
    AuthenticationError,
)

async def robust_call(prompt: str) -> str | None:
    client = AsyncAnthropic()
    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except AuthenticationError:
        print("Invalid API key")
        return None
    except RateLimitError:
        print("Rate limited")
        return None
    except APIConnectionError:
        print("Network error")
        return None
    except APIError as e:
        print(f"API error: {e}")
        return None
```

## Vision

```python
import base64
from anthropic import AsyncAnthropic

async def analyze_image(image_path: str, question: str) -> str:
    client = AsyncAnthropic()

    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    },
                },
                {"type": "text", "text": question},
            ],
        }],
    )
    return response.content[0].text
```

## Common Gotchas

1. **max_tokens required** - Unlike OpenAI, you must specify max_tokens
2. **System prompt location** - Top-level `system=` param, not in messages
3. **No fine-tuning** - Anthropic doesn't offer fine-tuning (yet)
4. **Content blocks** - Response content is a list, access `[0].text`
