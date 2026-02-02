# Data Preparation

Format specifications and validation requirements for each provider.

## OpenAI

### Chat Format (SFT)

```jsonl
{"messages": [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": "What is 2+2?"}, {"role": "assistant", "content": "4"}]}
{"messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there!"}]}
```

**Requirements:**
- JSONL format (one JSON object per line)
- `messages` array with `role` and `content`
- Roles: `system` (optional), `user`, `assistant`
- System message only at beginning if present
- Conversation must end with `assistant` message
- Upload with `purpose: "fine-tune"`

### Preference Format (DPO)

```jsonl
{"input": [{"role": "user", "content": "Explain quantum computing"}], "preferred_output": [{"role": "assistant", "content": "Clear explanation..."}], "non_preferred_output": [{"role": "assistant", "content": "Confusing explanation..."}]}
```

### Minimum Dataset Size

| Quality Level | Examples |
|---------------|----------|
| Minimum | 10 |
| Improvement visible | 50-100 |
| Recommended | 100+ |
| Optimal | 500-1000 |

### Validation

```bash
# Validate format
fine-tuner-cc validate training.jsonl --provider openai

# Check with OpenAI directly
openai api files.create -f training.jsonl -p fine-tune
```

## Vertex AI (Gemini)

### Supervised Tuning Format

```jsonl
{"contents": [{"role": "user", "parts": [{"text": "What is machine learning?"}]}, {"role": "model", "parts": [{"text": "Machine learning is..."}]}]}
{"systemInstruction": {"parts": [{"text": "You are an expert."}]}, "contents": [{"role": "user", "parts": [{"text": "Explain AI"}]}, {"role": "model", "parts": [{"text": "AI is..."}]}]}
```

**Requirements:**
- JSONL format
- `contents` array with `role` and `parts`
- Roles: `user`, `model` (not `assistant`!)
- `systemInstruction` optional (outside contents)
- `parts` array with `text` field
- Upload to Google Cloud Storage bucket in same project

### Multimodal Support

```jsonl
{"contents": [{"role": "user", "parts": [{"text": "Describe this image"}, {"fileData": {"mimeType": "image/jpeg", "fileUri": "gs://bucket/image.jpg"}}]}, {"role": "model", "parts": [{"text": "The image shows..."}]}]}
```

### Minimum Dataset Size

- Recommended: 100-500 examples
- More data generally improves quality

### Upload to GCS

```bash
# Create bucket
gsutil mb -l us-central1 gs://my-finetune-data

# Upload
gsutil cp training.jsonl gs://my-finetune-data/
```

## Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid JSON | Malformed line | Validate each line separately |
| Missing role | No role field | Add `role` to all messages |
| Wrong role name | `assistant` in Gemini | Use `model` for Vertex AI |
| Empty content | Blank message | Remove or populate |
| System not first | System message mid-conversation | Move to beginning |
| No assistant end | User message last | Add assistant response |

## Data Splitting

Standard split: **80% train / 10% validation / 10% test**

```bash
# Stratified split (maintains class distribution)
fine-tuner-cc split training.jsonl --train 80 --val 10 --test 10

# Output:
# training_train.jsonl (80%)
# training_val.jsonl (10%)
# training_test.jsonl (10%)
```

**Critical Rules:**
- Never overlap train and validation data
- Keep test set immutable
- Use stratified sampling for imbalanced data
- Apply preprocessing to train set only

## Preprocessing Checklist

- [ ] Validate JSON format for each line
- [ ] Check role names match provider
- [ ] Verify conversation ends with model/assistant
- [ ] Remove duplicates
- [ ] Check for PII/sensitive data
- [ ] Verify token counts within limits
- [ ] Split into train/val/test
- [ ] Upload to provider storage
