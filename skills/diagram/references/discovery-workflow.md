# Prototype Discovery Workflow

Complete workflow for pushing R&D findings from Project Polaris into the investor-prospecting diagram.

## Triggers

- "update diagram from prototype"
- "push finding to diagram"
- "sync discovery to diagram"

## Full Workflow

### Step 1: Identify Discovery Source

Ask user or scan for recent changes:

```bash
# Recent specs
ls -lt Project-polaris-experiment-A/.claude/specs/*.md | head -5

# Recent experiment results
ls -lt Project-polaris-experiment-A/scripts/*_results.json | head -5
```

**Source types:**
| Type | Location | Contains |
|------|----------|----------|
| Spec | `.claude/specs/*.md` | Algorithms, architecture decisions, thresholds |
| Experiment | `scripts/*_results.json` | Metrics, edge case frequencies, model comparisons |
| Architecture | `docs/models/*.md` | Data models, schema changes |

### Step 2: Extract Key Findings

From the source file, extract:

1. **Algorithm changes** - New logic, optimized paths
2. **Thresholds** - Confidence levels, cutoffs
3. **Edge cases** - Failure modes, frequencies, handling strategies
4. **Metrics** - Accuracy, coverage, latency

**Example extraction from chain-validation-algorithm.md:**
```
Finding: Chain swap optimization
- Algorithm: Select highest-confidence valid transition
- Threshold: 0.85 confidence minimum
- Edge case: 4.5% zero-confidence properties → LLM fallback
- Metric: 91.2% success rate on test set
```

### Step 3: Map to Diagram Nodes

Use the keyword-node map (`references/keyword-node-map.md`) or search:

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram search "chain" -d investor-prospecting
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram search "validation" -d investor-prospecting
```

### Step 4: Preview Current Node State

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram get B-A3-4 -d investor-prospecting
```

### Step 5: Prepare Update

Format edge cases using the standardized format (`references/edge-case-format.md`):

```json
{
  "edgeCases": [
    {
      "name": "Zero-confidence properties",
      "description": "No swap produces valid transitions",
      "frequency": "4.5%",
      "handling": "Route to LLM fallback",
      "source": "chain-validation-algorithm.md"
    }
  ],
  "prototypeSource": "chain-validation-algorithm.md",
  "lastUpdated": "2026-01-24"
}
```

### Step 6: Execute Update

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram update B-A3-4 -d investor-prospecting \
  --data '{"edgeCases": [...], "prototypeSource": "chain-validation-algorithm.md"}'
```

### Step 7: Log the Discovery

Add entry to `Project-polaris-experiment-A/.claude/discoveries/log.yaml`:

```yaml
- id: "DISC-001"
  type: algorithm
  title: "Chain Swap Optimization"
  source: ".claude/specs/chain-validation-algorithm.md"
  affected_nodes:
    - "B-A3-4"
  status: applied
  applied_at: "2026-01-24"
  summary: "Added zero-confidence edge case handling"
```

## Example Session

**User:** "push finding to diagram"

**Claude:**
1. "Which discovery source should I use?"
   - Offers: recent specs, experiment results, or manual path
2. User selects: `.claude/specs/chain-validation-algorithm.md`
3. Claude reads spec, extracts findings
4. Claude maps keywords → `B-A3-4` (Chain Swap Optimization)
5. Claude shows preview:
   ```
   Node: B-A3-4 (Chain Swap Optimization)
   Will add:
   - Edge case: Zero-confidence properties (4.5%)
   - Source link: chain-validation-algorithm.md
   ```
6. User confirms
7. Claude executes update, logs to discoveries/log.yaml
8. Claude reports success with node link

## Verification

After update:

```bash
# Verify node updated
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec diagram get B-A3-4 -d investor-prospecting

# Verify in diagram JSON
cat /Users/andyrong/dg-prototype/public/data/diagrams/investor-prospecting/nodes/B-A3-4.json
```
