# Gemini SDK Reference

**Last verified:** January 2026

## Environment Setup

### Vertex AI (Recommended for Fine-Tuning)

```bash
# Install
pip install google-cloud-aiplatform

# Authenticate
gcloud auth application-default login

# Set project
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
```

### Gemini API (Consumer, Inference Only)

```bash
export GEMINI_API_KEY="..."
```

**Note:** Gemini API (consumer) deprecated fine-tuning. Use Vertex AI for fine-tuning.

## Vertex AI Client

```python
import vertexai
from vertexai.generative_models import GenerativeModel

# Initialize once
vertexai.init(project="your-project", location="us-central1")

async def call_gemini(prompt: str) -> str:
    model = GenerativeModel("gemini-2.5-flash")
    response = await model.generate_content_async(prompt)
    return response.text
```

## Structured Output

```python
from vertexai.generative_models import GenerativeModel, GenerationConfig
import json

async def extract_structured(text: str) -> dict:
    model = GenerativeModel("gemini-2.5-flash")

    response = await model.generate_content_async(
        f"Extract as JSON: {text}",
        generation_config=GenerationConfig(
            response_mime_type="application/json",
        ),
    )
    return json.loads(response.text)
```

**Warning:** Fine-tuned Gemini models + JSON mode can have quality issues. Test thoroughly.

## Context Caching (90% Discount)

```python
from vertexai.generative_models import GenerativeModel
from vertexai.caching import CachedContent
from datetime import timedelta

# Create cache (good for large system prompts or documents)
cached = CachedContent.create(
    model_name="gemini-2.5-flash",
    contents=[large_document],  # e.g., 100k+ token document
    ttl=timedelta(hours=1),
    display_name="my-cache",
)

# Use cached content
model = GenerativeModel.from_cached_content(cached)
response = await model.generate_content_async("Question about the document?")
```

**When to use context caching:**
- Large system prompts (>10k tokens)
- Reference documents reused across many requests
- Minimum 32k tokens to cache

## Training Data Format Conversion

OpenAI format → Gemini format:

```python
def openai_to_gemini(openai_example: dict) -> dict:
    """Convert OpenAI chat format to Gemini tuning format."""
    messages = openai_example["messages"]

    # Extract system prompt
    system = next((m["content"] for m in messages if m["role"] == "system"), None)

    # Convert to Gemini format
    gemini_messages = []
    for msg in messages:
        if msg["role"] == "system":
            continue  # Handled separately
        role = "user" if msg["role"] == "user" else "model"
        gemini_messages.append({"role": role, "parts": [{"text": msg["content"]}]})

    result = {"contents": gemini_messages}
    if system:
        result["systemInstruction"] = {"parts": [{"text": system}]}

    return result
```

## Rate Limiting

```python
import asyncio
from google.api_core.exceptions import ResourceExhausted

async def call_with_backoff(prompt: str, max_retries: int = 3) -> str:
    model = GenerativeModel("gemini-2.5-flash")

    for attempt in range(max_retries):
        try:
            response = await model.generate_content_async(prompt)
            return response.text
        except ResourceExhausted:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            else:
                raise
```

## Batch Processing Pattern

```python
import asyncio
from vertexai.generative_models import GenerativeModel

async def batch_process(
    prompts: list[str],
    requests_per_second: float = 5.0,
) -> list[str]:
    """Rate-limited batch processing for Gemini."""
    model = GenerativeModel("gemini-2.5-flash")
    delay = 1.0 / requests_per_second

    async def process_one(prompt: str) -> str:
        response = await model.generate_content_async(prompt)
        return response.text

    tasks = []
    for prompt in prompts:
        await asyncio.sleep(delay)
        tasks.append(asyncio.create_task(process_one(prompt)))

    return await asyncio.gather(*tasks)
```

## Fine-Tuning via Vertex AI

```python
from vertexai.tuning import sft

# Start tuning job
job = sft.train(
    source_model="gemini-2.5-flash",
    train_dataset="gs://bucket/train.jsonl",
    validation_dataset="gs://bucket/val.jsonl",  # Optional
    tuned_model_display_name="my-tuned-model",
    epochs=3,
    learning_rate_multiplier=1.0,
)

# Monitor
print(f"Job: {job.resource_name}")
job.wait()
print(f"Tuned model: {job.tuned_model_endpoint_name}")
```

## Common Gotchas

1. **Flash-Lite not fine-tunable** - Use Gemini 2.5 Flash, not Flash-Lite
2. **JSON + fine-tuning** - Quality degrades; test before production
3. **Rate limits lower** - 5 req/sec vs OpenAI's 50-100
4. **Async requires await** - `generate_content_async()` not `generate_content()`
