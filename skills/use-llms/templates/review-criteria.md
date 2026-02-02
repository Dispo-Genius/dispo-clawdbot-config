# Dataset Review Criteria

Default pass/fail criteria for fine-tuning dataset reviews.

## Criteria Table

| Criterion | Check | PASS | FAIL |
|-----------|-------|------|------|
| Format | Parse each line as JSON | 0 parse errors | Any parse error |
| Schema | Check messages/contents array | All have required fields | Missing role/content |
| Balance | Count unique outputs, compute ratio | Ratio ≤ 3:1 | Ratio > 3:1 |
| Quality | Check for empty/truncated responses | Empty < 1% | Empty ≥ 1% |
| Duplicates | Hash inputs, count collisions | Duplicates < 5% | Duplicates ≥ 5% |

## Criterion Details

### Format
- Parse each line as JSON
- Track line numbers of failures
- PASS: Zero parse errors
- FAIL: Any parse error (report line numbers)

### Schema
- For OpenAI format: Check `messages` array exists, each has `role` and `content`
- For Vertex format: Check `contents` array exists, each has `role` and `parts`
- PASS: All examples have required fields
- FAIL: Any missing field (report which field, which line)

### Balance
- Count unique assistant/model responses
- If < 20 unique values, treat as classification and compute class ratio
- PASS: max_count / min_count ≤ 3.0
- FAIL: ratio > 3.0 (report counts per class)

### Quality
- Check for empty assistant/model responses (whitespace only)
- Check for truncated responses (ends mid-sentence, unclosed JSON)
- PASS: Empty/truncated < 1% of total
- FAIL: Empty/truncated ≥ 1% (report count and percentage)

### Duplicates
- Hash user inputs (ignore whitespace differences)
- Count collisions (same input appearing multiple times)
- PASS: Duplicates < 5% of total
- FAIL: Duplicates ≥ 5% (report count and percentage)

## Custom Criteria

To create custom criteria, copy this file and modify:
1. Adjust thresholds (e.g., stricter balance ratio)
2. Add new criteria (e.g., token length limits)
3. Remove irrelevant criteria (e.g., balance for generative tasks)

Pass custom criteria file with `--criteria ./my-criteria.md`
