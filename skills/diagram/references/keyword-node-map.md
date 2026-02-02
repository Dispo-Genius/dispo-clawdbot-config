# Keyword to Node Map

Index for mapping discovery keywords to investor-prospecting diagram nodes.

## Quick Reference

| Keyword | Node ID | Node Title |
|---------|---------|------------|
| chain_validation | B-A3-4 | Chain Swap Optimization |
| find_best_swaps | B-A3-4 | Chain Swap Optimization |
| swap_chain | B-A3-4 | Chain Swap Optimization |
| confidence_score | B-A3-4 | Chain Swap Optimization |
| owner_assignment | B-A3-2 | Owner Resolution |
| fuzzy_match | B-A3-2 | Owner Resolution |
| entity_resolution | B-A3-2 | Owner Resolution |
| PropertyStatus | B-A3-1 | Status Classification |
| IncompleteReason | B-A3-1 | Status Classification |
| status_model | B-A3-1 | Status Classification |
| llm_fallback | B-A3-1 | Status Classification |
| gemini | B-A3-1 | Status Classification |
| price_history | B-A3-3 | Price History Resolution |
| mls_merge | B-A3-3 | Price History Resolution |
| source_priority | B-A3-3 | Price History Resolution |
| reapi | B-A2 | Data Ingestion |
| redfin | B-A2 | Data Ingestion |
| data_fetch | B-A2 | Data Ingestion |

## By Node

### B-A3-1: Status Classification
Keywords: `PropertyStatus`, `IncompleteReason`, `status_model`, `llm_fallback`, `gemini`, `classification`

Related specs:
- `v2-llm-fallback-pipeline.md`
- `price-history-resolution-v2.md`

### B-A3-2: Owner Resolution
Keywords: `owner_assignment`, `fuzzy_match`, `entity_resolution`, `owner_match`, `gpt41_nano`

Related specs:
- `finetune-gpt41-nano.md`

### B-A3-3: Price History Resolution
Keywords: `price_history`, `mls_merge`, `source_priority`, `price_chain`, `history_merge`

Related specs:
- `price-history-resolution-v2.md`

### B-A3-4: Chain Swap Optimization
Keywords: `chain_validation`, `find_best_swaps`, `swap_chain`, `confidence_score`, `transition_valid`

Related specs:
- `chain-validation-algorithm.md`

### B-A2: Data Ingestion
Keywords: `reapi`, `redfin`, `data_fetch`, `api_call`, `batch_fetch`

Related specs:
- (various pipeline scripts)

## Search Commands

When keywords don't match, use diagram-cc search:

```bash
# Search by keyword
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram search "validation" -d investor-prospecting

# Search by description text
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram search "property status" -d investor-prospecting

# Get full tree to browse
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram tree -d investor-prospecting
```

## Adding New Mappings

When discovering a new keyword-to-node mapping:

1. Verify the node exists: `diagram-cc get {nodeId} -d investor-prospecting`
2. Add entry to this file under both "Quick Reference" and "By Node" sections
3. Include the related spec file

## Spec to Node Matrix

| Spec File | Primary Nodes |
|-----------|---------------|
| chain-validation-algorithm.md | B-A3-4 |
| finetune-gpt41-nano.md | B-A3-2 |
| price-history-resolution-v2.md | B-A3-1, B-A3-3 |
| v2-llm-fallback-pipeline.md | B-A3-1 |
