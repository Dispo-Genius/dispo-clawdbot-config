# model-fine-tuner

CLI reference for `model-fine-tuner`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `validate` | Validate JSONL format for a provider |
| `analyze` | Analyze dataset statistics |
| `split` | Split dataset into train/val/test |
| `upload` | Upload training file to OpenAI |
| `create` | Create fine-tuning job from uploaded file |
| `status` | Check fine-tuning job status |
| `list-jobs` | List recent fine-tuning jobs |
| `run` | Run rate-limited batch inference on input JSONL |
| `models-available` | List available models with capabilities |
| `pricing` | Show current pricing for fine-tuning |
| `review` | Review dataset quality |
| `help-workflow` | Show end-to-end fine-tuning workflow |

---

## validate

Validate JSONL format for a provider

```bash
model-fine-tuner validate [options] <file>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | Yes | Provider (openai, vertex, bedrock) (default: |

---

## analyze

Analyze dataset statistics

```bash
model-fine-tuner analyze [options] <file>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--tokens` | No | Include token analysis |

---

## split

Split dataset into train/val/test

```bash
model-fine-tuner split [options] <file>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--train <percent>` | No | Training set percentage (default: 80) |
| `--val <percent>` | No | Validation set percentage (default: 10) |
| `--test <percent>` | No | Test set percentage (default: 10) |

---

## upload

Upload training file to OpenAI

```bash
model-fine-tuner upload [options] <file>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | No | Provider (openai) (default: openai) |
| `--purpose <purpose>` | No | File purpose (default: fine-tune) |
| `-y, --yes` | No | Skip confirmation prompt |

---

## create

Create fine-tuning job from uploaded file

```bash
model-fine-tuner create [options] <file-id>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | No | Provider (openai) (default: openai) |
| `-m, --model <model>` | Yes | Base model to fine-tune (default: |
| `-s, --suffix <suffix>` | Yes | Model suffix for identification (e.g., |
| `--epochs <n>` | No | Number of training epochs (default: auto) |
| `--batch-size <n>` | No | Training batch size (default: auto) |
| `--lr-multiplier <n>` | No | Learning rate multiplier (default: auto) |
| `--validation-file <id>` | Yes | Validation file ID |
| `-y, --yes` | No | Skip confirmation prompt |

---

## status

Check fine-tuning job status

```bash
model-fine-tuner status [options] <job-id>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | No | Provider (openai) (default: openai) |
| `--poll` | No | Poll until job completes |
| `--interval <seconds>` | No | Polling interval in seconds (default: 30) |

---

## list-jobs

List recent fine-tuning jobs

```bash
model-fine-tuner list-jobs [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | No | Provider (openai) (default: openai) |
| `-n, --limit <n>` | No | Number of jobs to show (default: 10) |

---

## run

Run rate-limited batch inference on input JSONL

```bash
model-fine-tuner run [options] <input>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | No | Provider (openai, gemini) (default: openai) |
| `-m, --model <model>` | Yes | Model ID (e.g., gpt-5.2-instant, gemini-3-flash) |
| `-o, --output <path>` | No | Output JSONL path (default: output.jsonl) |
| `-t, --temperature <temp>` | No | Temperature (0.0-1.0) (default: 0.0) |
| `-r, --rate-limit <n>` | Yes | Requests per second (overrides provider default) |
| `--auto` | No | Auto-detect best model and settings from input |
| `--review` | No | Run delegated review after completion |
| `--dry-run` | No | Validate input without making API calls |
| `--batch` | No | Force Batch API mode (50% cheaper, 24h SLA) |
| `--sync` | No | Force synchronous mode (overrides auto-batch) |

---

## models-available

List available models with capabilities

```bash
model-fine-tuner models-available [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --provider <provider>` | Yes | Provider (openai, gemini, bedrock) |
| `--sync` | No | Force sync model info from APIs |

---

## pricing

Show current pricing for fine-tuning

```bash
model-fine-tuner pricing [options]
```

---

## review

Review dataset quality

```bash
model-fine-tuner review [options] <file>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--delegate` | No | Run review in separate Claude session (saves context) |
| `--criteria <path>` | Yes | Custom criteria file |
| `--sample <n>` | No | Sample size for large files (default: 50) |
| `--account <n>` | No | CCS account to use for delegation (default: 2) |
| `--output <path>` | Yes | Save full report to path |

---

## help-workflow

Show end-to-end fine-tuning workflow

```bash
model-fine-tuner help-workflow [options]
```

---
