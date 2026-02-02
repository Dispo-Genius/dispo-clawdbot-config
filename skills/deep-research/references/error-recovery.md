# Error Recovery

Failure handling patterns for robust research execution.

---

## Core Principles

### 1. Isolation

One agent failure NEVER cascades to others. Each agent operates independently.

```
Agent 1 ──→ Success ──┐
Agent 2 ──→ Timeout ──┼──→ Proceed with partial results
Agent 3 ──→ Success ──┘
```

### 2. Partial Completion

Always produce output, even if incomplete. A partial answer is better than no answer.

### 3. Graceful Degradation

When components fail, the system continues with reduced capability rather than stopping entirely.

---

## Error Types & Strategies

### Agent Timeout

**Trigger:** Agent exceeds 5-minute limit

**Strategy:**
1. Capture any partial output produced
2. Log timeout with agent details
3. Continue with other agents
4. Flag dimension as "incomplete" in final report

**Implementation:**
```typescript
const result = await Promise.race([
  runAgent(config),
  timeout(5 * 60 * 1000).then(() => ({
    status: 'timeout',
    partial: capturePartialOutput()
  }))
]);
```

### API Rate Limit

**Trigger:** 429 response from WebSearch or WebFetch

**Strategy:**
1. Exponential backoff: 1s → 2s → 4s → 8s
2. Add jitter: ±25% randomization
3. Max 3 retries
4. If still failing, mark search as skipped

**Implementation:**
```typescript
const backoff = async (attempt: number) => {
  const base = Math.pow(2, attempt) * 1000;
  const jitter = base * 0.25 * (Math.random() - 0.5);
  await sleep(base + jitter);
};
```

### WebSearch Failure

**Trigger:** Search returns error or no results

**Strategy:**
1. Retry with rephrased query (2 attempts)
2. If still failing, mark dimension as incomplete
3. Continue with other dimensions
4. Note in methodology section

**Rephrasing Approaches:**
- Remove specific terms, use broader query
- Try alternative terminology
- Focus on core concept only

### WebFetch Failure

**Trigger:** Cannot fetch URL content

**Strategy:**
1. Retry once after 2 seconds
2. If 404/410: Mark source as unavailable
3. If timeout: Try shorter timeout, then skip
4. If paywall/auth: Skip, note as inaccessible
5. Continue with other sources

### Agent Produces No Results

**Trigger:** Agent returns empty or minimal findings

**Strategy:**
1. Log the empty result
2. Continue with other agents
3. This becomes a "gap" for Phase 3
4. May trigger deep dive if critical

### Contradictory Findings

**Trigger:** Agents return conflicting information

**Strategy:**
1. NOT an error - expected behavior
2. Escalate to credibility assessment
3. Prefer higher-credibility source
4. If equal credibility, flag as unresolved
5. Include both views in final report

### Invalid Source

**Trigger:** Source URL is broken, moved, or invalid

**Strategy:**
1. Try Wayback Machine archive
2. Search for updated URL
3. If can't resolve, drop source
4. Note claim as "source unavailable"

---

## Recovery Patterns

### Circuit Breaker

If a service fails repeatedly, stop trying temporarily:

```typescript
class CircuitBreaker {
  failures = 0;
  lastFailure = 0;
  threshold = 3;
  resetTimeout = 60000; // 1 minute

  async call(fn) {
    if (this.isOpen()) {
      throw new Error('Circuit open - service unavailable');
    }
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (e) {
      this.failures++;
      this.lastFailure = Date.now();
      throw e;
    }
  }

  isOpen() {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.failures = 0; // Reset for retry
        return false;
      }
      return true;
    }
    return false;
  }
}
```

### Fallback Chain

Try alternatives in order:

```
Primary Source → Secondary Source → Cached Data → Degraded Response
```

Example for web research:
1. WebSearch → Direct search
2. WebSearch (alternative query) → Rephrased
3. Known authoritative URLs → Hardcoded fallbacks
4. "Unable to research this dimension" → Graceful failure

### Checkpoint & Resume

For long-running research, save intermediate state:

```markdown
## Research Checkpoint

**Phase:** 1 (Initial Research)
**Completed Agents:** 3/5
**Pending Agents:** 2
**Elapsed Time:** 2m 30s

### Completed Results
{serialized agent outputs}

### Pending
- Agent 4: research-web (dimension: security)
- Agent 5: research-codebase (dimension: implementation)
```

---

## Error Reporting

### In Final Report

Always include error summary in methodology:

```markdown
## Methodology

### Execution Summary
- Agents deployed: 7
- Agents completed: 6
- Agents timed out: 1
- Web searches: 45 attempted, 42 successful
- Sources fetched: 38 attempted, 35 successful

### Issues Encountered
| Issue | Count | Impact |
|-------|-------|--------|
| Agent timeout | 1 | Dimension "X" incomplete |
| Search failure | 3 | Some queries unanswered |
| Source unavailable | 3 | Claims marked unverified |

### Dimensions Affected
- {dimension}: Partial coverage due to agent timeout
```

### User Notification

For critical failures, notify user:

**Escalation Criteria:**
- > 30% of agents fail
- All searches for a critical dimension fail
- No high-credibility sources found

**Notification Format:**
```markdown
⚠️ Research encountered significant issues:

- {issue 1}
- {issue 2}

Proceeding with partial results. Final report will note limitations.

Continue anyway? [Y/n]
```

---

## Testing Error Handling

### Simulated Failures

Test the system with:
- Intentional agent timeouts
- Invalid URLs
- Rate limit simulation
- Empty search results

### Validation Checklist

- [ ] Timeout doesn't crash orchestrator
- [ ] Rate limits trigger backoff
- [ ] Partial results are captured
- [ ] Errors are logged
- [ ] Final report acknowledges issues
- [ ] No silent failures
