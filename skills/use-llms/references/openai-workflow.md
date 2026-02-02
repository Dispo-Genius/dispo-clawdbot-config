# OpenAI Fine-Tuning Workflow

Step-by-step guide for fine-tuning GPT-4.1, GPT-4.1-mini, and GPT-4.1-nano.

## Prerequisites

- OpenAI API key with fine-tuning access
- Training data in JSONL format
- Validation data (optional but recommended)

## Workflow

```
1. Prepare Data → 2. Upload Files → 3. Create Job → 4. Monitor → 5. Evaluate → 6. Deploy
```

## 1. Prepare Data

### Format

```jsonl
{"messages": [{"role": "system", "content": "You classify sentiment."}, {"role": "user", "content": "Great product!"}, {"role": "assistant", "content": "positive"}]}
{"messages": [{"role": "user", "content": "Terrible service"}, {"role": "assistant", "content": "negative"}]}
```

### Validate

```bash
fine-tuner-cc validate training.jsonl --provider openai
```

### Split (if needed)

```bash
fine-tuner-cc split training.jsonl --train 80 --val 20
```

## 2. Upload Files

### CLI

```bash
fine-tuner-cc upload training.jsonl --provider openai
# Output: file-abc123

fine-tuner-cc upload validation.jsonl --provider openai
# Output: file-def456
```

### API

```bash
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="fine-tune" \
  -F file="@training.jsonl"
```

### Python

```python
from openai import OpenAI
client = OpenAI()

file = client.files.create(
    file=open("training.jsonl", "rb"),
    purpose="fine-tune"
)
print(file.id)  # file-abc123
```

## 3. Create Fine-Tuning Job

### CLI

```bash
fine-tuner-cc create file-abc123 --provider openai \
  --model gpt-4.1-nano-2025-04-14 \
  --validation-file file-def456 \
  --epochs 3
# Output: ftjob-xyz789
```

### API

```bash
curl https://api.openai.com/v1/fine_tuning/jobs \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "training_file": "file-abc123",
    "validation_file": "file-def456",
    "model": "gpt-4.1-nano-2025-04-14",
    "hyperparameters": {
      "n_epochs": 3
    }
  }'
```

### Python

```python
job = client.fine_tuning.jobs.create(
    training_file="file-abc123",
    validation_file="file-def456",
    model="gpt-4.1-nano-2025-04-14",
    hyperparameters={"n_epochs": 3}
)
print(job.id)  # ftjob-xyz789
```

## 4. Monitor Progress

### Status Values

| Status | Meaning |
|--------|---------|
| `validating_files` | Checking format |
| `queued` | Waiting to start |
| `running` | Training in progress |
| `succeeded` | Complete |
| `failed` | Error occurred |
| `cancelled` | User cancelled |

### CLI

```bash
fine-tuner-cc status ftjob-xyz789
# Output:
# Status: running
# Progress: 67% (epoch 2/3)
# Metrics:
#   train_loss: 0.45
#   valid_loss: 0.52

fine-tuner-cc events ftjob-xyz789
# Output: Training event log
```

### API

```bash
# Get job status
curl https://api.openai.com/v1/fine_tuning/jobs/ftjob-xyz789 \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Get events
curl https://api.openai.com/v1/fine_tuning/jobs/ftjob-xyz789/events \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Checkpoints

OpenAI saves checkpoints from the last 3 epochs:

```bash
fine-tuner-cc checkpoints ftjob-xyz789
# Output:
# Checkpoint 1: step 100, valid_loss: 0.60
# Checkpoint 2: step 200, valid_loss: 0.52
# Checkpoint 3: step 300, valid_loss: 0.48
```

## 5. Evaluate

### Get Fine-Tuned Model

```bash
fine-tuner-cc status ftjob-xyz789
# Output: fine_tuned_model: ft:gpt-4.1-nano-2025-04-14:org::abc123
```

### Test Model

```bash
fine-tuner-cc evaluate ft:gpt-4.1-nano-2025-04-14:org::abc123 test.jsonl
# Output:
# Accuracy: 94.5%
# Precision: 0.93
# Recall: 0.95
# F1: 0.94
```

### Compare to Base

```bash
fine-tuner-cc compare gpt-4.1-nano-2025-04-14 ft:gpt-4.1-nano-2025-04-14:org::abc123 test.jsonl
# Output:
# Base model: 78% accuracy
# Fine-tuned: 94.5% accuracy
# Improvement: +16.5%
```

## 6. Deploy

### Use Fine-Tuned Model

```python
response = client.chat.completions.create(
    model="ft:gpt-4.1-nano-2025-04-14:org::abc123",
    messages=[
        {"role": "user", "content": "Amazing product, love it!"}
    ]
)
print(response.choices[0].message.content)  # positive
```

### Monitor Production

Track:
- Latency
- Error rate
- Output quality (sample and review)
- Cost

## Hyperparameters

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `n_epochs` | auto | 1-50 | More epochs = more training |
| `learning_rate_multiplier` | auto | 0.02-0.2 | Higher = faster learning |
| `batch_size` | auto | varies | Larger = more stable |

### Recommendations

- Start with defaults (`auto`)
- If underfitting: increase epochs, increase learning rate
- If overfitting: decrease epochs, add validation data

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `invalid_file_format` | Bad JSONL | Validate with CLI |
| `insufficient_examples` | <10 examples | Add more data |
| High validation loss | Overfitting | Reduce epochs, add data |
| No improvement | Bad data or task | Review dataset quality |
| Job stuck in queue | High demand | Wait or try off-peak |

## Costs

| Model | Training | Inference (tuned) |
|-------|----------|-------------------|
| GPT-4.1 | $25/M tokens | $3/M in, $12/M out |
| GPT-4.1-mini | Lower | Lower |
| GPT-4.1-nano | Lowest | Lowest |

Training tokens = examples × tokens_per_example × epochs
