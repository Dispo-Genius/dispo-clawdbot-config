# Vertex AI Fine-Tuning Workflow

Step-by-step guide for fine-tuning Gemini 2.5 Pro and Gemini 2.5 Flash on Google Cloud.

## Prerequisites

- Google Cloud account with Vertex AI enabled
- Project with billing enabled
- Google Cloud Storage bucket
- `gcloud` CLI installed and configured

**Important:** Gemini 2.5 Flash-Lite is NOT fine-tunable. Use Gemini 2.5 Flash instead.

## Workflow

```
1. Prepare Data → 2. Upload to GCS → 3. Create Tuning Job → 4. Monitor → 5. Evaluate → 6. Deploy
```

## 1. Prepare Data

### Format

```jsonl
{"contents": [{"role": "user", "parts": [{"text": "Classify: Great product!"}]}, {"role": "model", "parts": [{"text": "positive"}]}]}
{"contents": [{"role": "user", "parts": [{"text": "Classify: Terrible service"}]}, {"role": "model", "parts": [{"text": "negative"}]}]}
```

**Note:** Use `model` not `assistant` for the response role.

### With System Instruction

```jsonl
{"systemInstruction": {"parts": [{"text": "You are a sentiment classifier."}]}, "contents": [{"role": "user", "parts": [{"text": "Great product!"}]}, {"role": "model", "parts": [{"text": "positive"}]}]}
```

### Validate

```bash
fine-tuner-cc validate training.jsonl --provider vertex
```

## 2. Upload to Google Cloud Storage

### Create Bucket

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Create bucket (same region as tuning)
gsutil mb -l us-central1 gs://YOUR_BUCKET_NAME
```

### Upload Data

```bash
gsutil cp training.jsonl gs://YOUR_BUCKET_NAME/fine-tune/
gsutil cp validation.jsonl gs://YOUR_BUCKET_NAME/fine-tune/
```

### Verify

```bash
gsutil ls gs://YOUR_BUCKET_NAME/fine-tune/
```

## 3. Create Tuning Job

### Via Vertex AI Studio (Console)

1. Go to Vertex AI Studio > Tune and Distill
2. Click "Create tuned model"
3. Select base model (Gemini 2.5 Flash)
4. Point to GCS training data
5. Configure hyperparameters
6. Start tuning

### Via API

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/tuningJobs" \
  -d '{
    "baseModel": "gemini-2.5-flash",
    "supervisedTuningSpec": {
      "trainingDatasetUri": "gs://YOUR_BUCKET/fine-tune/training.jsonl",
      "validationDatasetUri": "gs://YOUR_BUCKET/fine-tune/validation.jsonl"
    },
    "tunedModelDisplayName": "my-tuned-model"
  }'
```

### Via Python SDK

```python
from google.cloud import aiplatform

aiplatform.init(project="YOUR_PROJECT", location="us-central1")

tuning_job = aiplatform.SupervisedTuningJob.create(
    base_model="gemini-2.5-flash",
    training_data="gs://YOUR_BUCKET/fine-tune/training.jsonl",
    validation_data="gs://YOUR_BUCKET/fine-tune/validation.jsonl",
    tuned_model_display_name="my-tuned-model",
    epochs=3,
)
```

## 4. Monitor Progress

### Console

Monitor in Vertex AI Studio > Tune and Distill > Your Job

### CLI

```bash
fine-tuner-cc status TUNING_JOB_ID --provider vertex
```

### API

```bash
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/tuningJobs/TUNING_JOB_ID"
```

### Metrics

- Training loss
- Validation loss
- Tokens processed
- Time remaining

## 5. Evaluate

### Get Tuned Model Endpoint

After tuning completes:
- Model appears in Model Registry
- Create endpoint or use existing

### Test Model

```python
from vertexai.generative_models import GenerativeModel

model = GenerativeModel("projects/YOUR_PROJECT/locations/us-central1/endpoints/ENDPOINT_ID")

response = model.generate_content("Classify: Amazing product, love it!")
print(response.text)  # positive
```

### Batch Evaluation

```bash
fine-tuner-cc evaluate ENDPOINT_ID test.jsonl --provider vertex
```

## 6. Deploy

### Create Endpoint (if needed)

```python
endpoint = aiplatform.Endpoint.create(display_name="my-tuned-endpoint")
```

### Deploy Model

```python
model = aiplatform.Model("projects/YOUR_PROJECT/locations/us-central1/models/MODEL_ID")
model.deploy(endpoint=endpoint)
```

### Production Usage

```python
response = endpoint.predict(instances=[{"content": "Classify: Great service!"}])
print(response.predictions)
```

## Cost Optimization

### Batch API (50% discount)

For non-realtime workloads:

```python
from vertexai.batch_prediction import BatchPredictionJob

job = BatchPredictionJob.submit(
    source_model="projects/YOUR_PROJECT/locations/us-central1/endpoints/ENDPOINT_ID",
    input_dataset="gs://YOUR_BUCKET/batch_input.jsonl",
    output_uri_prefix="gs://YOUR_BUCKET/batch_output/"
)
```

### Context Caching (90% discount)

Cache repeated context:

```python
from vertexai.caching import CachedContent

cache = CachedContent.create(
    model_name="gemini-2.5-flash",
    system_instruction="You are a sentiment classifier. Output only: positive, negative, or neutral.",
    ttl_seconds=3600
)

# Use cached context
model = GenerativeModel.from_cached_content(cache)
response = model.generate_content("Classify: Great product!")
```

**Note:** Batch and cache discounts do NOT stack.

## Pricing

| Item | Cost |
|------|------|
| Training compute | ~$20/hour |
| Training tokens | Included in compute |
| Inference (tuned) | Same as base model |
| Batch inference | 50% discount |
| Cached tokens | 25% of standard |

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Permission denied | IAM roles | Grant Vertex AI User role |
| Bucket not found | Wrong region | Create bucket in same region |
| Invalid format | Wrong role names | Use `model` not `assistant` |
| Tuning failed | Bad data | Check format, validate |
| High loss | Not enough data | Add more examples (100+) |

## Supported Models

| Model | Tuning Methods |
|-------|---------------|
| Gemini 2.5 Pro | Supervised, Preference |
| Gemini 2.5 Flash | Supervised, Preference |
| Gemini 2.5 Flash-Lite | ❌ NOT SUPPORTED |
| Gemini 2.0 Flash | Supervised (legacy) |
