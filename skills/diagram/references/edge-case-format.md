# Edge Case Format

Standardized format for documenting edge cases in diagram node `data` fields.

## Schema

```json
{
  "data": {
    "edgeCases": [
      {
        "name": "string - short identifier",
        "description": "string - what causes this edge case",
        "frequency": "string - how often (%, per-day, rare/common)",
        "handling": "string - how the system handles it",
        "source": "string - discovery source file"
      }
    ],
    "prototypeSource": "string - primary spec/experiment file",
    "lastUpdated": "string - ISO date"
  }
}
```

## Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Short identifier (2-5 words) |
| `description` | Yes | What triggers this edge case |
| `frequency` | Yes | Occurrence rate: percentage, count, or qualitative |
| `handling` | Yes | How the system responds |
| `source` | Yes | File that documents this edge case |

## Examples

### Algorithm Edge Case

```json
{
  "name": "Zero-confidence properties",
  "description": "No swap produces valid status transitions",
  "frequency": "4.5%",
  "handling": "Route to LLM fallback pipeline",
  "source": "chain-validation-algorithm.md"
}
```

### Data Quality Edge Case

```json
{
  "name": "Missing MLS history",
  "description": "Property has no MLS records in any source",
  "frequency": "12%",
  "handling": "Use county records only, flag as incomplete",
  "source": "price-history-resolution-v2.md"
}
```

### Model Edge Case

```json
{
  "name": "Low-confidence owner match",
  "description": "Fuzzy match score below 0.7 threshold",
  "frequency": "8%",
  "handling": "Queue for manual review",
  "source": "finetune-gpt41-nano.md"
}
```

### External API Edge Case

```json
{
  "name": "Rate limit exceeded",
  "description": "REAPI returns 429 during bulk fetch",
  "frequency": "2-3 per day during peak",
  "handling": "Exponential backoff, max 5 retries",
  "source": "v2-llm-fallback-pipeline.md"
}
```

## Full Node Update Example

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram update B-A3-4 -d investor-prospecting \
  --data '{
    "edgeCases": [
      {
        "name": "Zero-confidence properties",
        "description": "No swap produces valid status transitions",
        "frequency": "4.5%",
        "handling": "Route to LLM fallback pipeline",
        "source": "chain-validation-algorithm.md"
      },
      {
        "name": "Circular swap chains",
        "description": "Swap sequence creates loop",
        "frequency": "0.3%",
        "handling": "Detect and break at lowest confidence edge",
        "source": "chain-validation-algorithm.md"
      }
    ],
    "prototypeSource": "chain-validation-algorithm.md",
    "lastUpdated": "2026-01-24"
  }'
```

## Frequency Guidelines

| Rate | Format Examples |
|------|-----------------|
| Percentage | "4.5%", "~10%", "<1%" |
| Count | "2-3 per day", "~100 per batch" |
| Qualitative | "rare", "common", "edge case" |

Use percentages when you have test data. Use qualitative for observed-but-unmeasured cases.
