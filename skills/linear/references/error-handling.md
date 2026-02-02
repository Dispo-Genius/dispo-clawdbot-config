# Error Handling

How to handle errors gracefully when calling the Linear API.

---

## Critical Principle

**Linear failures should NEVER block the main workflow.**

Git operations, commits, and PR creation must continue even if Linear is unavailable.

---

## Common HTTP Errors

| Code | Error | Cause | Action |
|------|-------|-------|--------|
| 401 | Unauthorized | Invalid/expired API key | Check `$LINEAR_API_KEY` env var |
| 429 | Too Many Requests | Rate limit hit | Wait 60s, retry |
| 400 | Bad Request | Invalid GraphQL query | Check query syntax |
| 500 | Server Error | Linear issue | Retry with backoff |

---

## GraphQL Errors

GraphQL errors appear in the response body, not HTTP status:

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ],
  "data": null
}
```

### Check for errors:
```bash
ERRORS=$(echo "$RESPONSE" | jq -r '.errors[0].message // empty')
if [ -n "$ERRORS" ]; then
  echo "GraphQL Error: $ERRORS"
fi
```

---

## Graceful Degradation

### If API key not set:
```bash
if [ -z "$LINEAR_API_KEY" ]; then
  echo "Warning: LINEAR_API_KEY not configured"
  echo "Skipping Linear integration - continuing with git workflow"
  # Continue without Linear
fi
```

### If API call fails:
```bash
RESPONSE=$(curl -s -w "\n%{http_code}" ...)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "Warning: Linear API returned $HTTP_CODE"
  echo "Continuing without Linear update"
  # Don't exit, continue workflow
fi
```

---

## Retry Pattern

For transient failures (429, 500, network errors):

```bash
MAX_RETRIES=3
RETRY_DELAY=2

linear_api_call() {
  local query="$1"

  for i in $(seq 1 $MAX_RETRIES); do
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Content-Type: application/json" \
      -H "Authorization: $LINEAR_API_KEY" \
      -d "$query" \
      https://api.linear.app/graphql)

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
      echo "$BODY"
      return 0
    elif [ "$HTTP_CODE" = "429" ]; then
      echo "Rate limited, waiting..." >&2
      sleep $((RETRY_DELAY * i))
    else
      break  # Non-retryable error
    fi
  done

  echo "Warning: Linear API failed after $MAX_RETRIES attempts" >&2
  return 1
}
```

---

## Shared Error Handling

For standardized error handling patterns, see [shared error handling](../../_shared/linear-integration/error-handling.md).

---

## Response Parsing (jq patterns)

### Success check:
```bash
SUCCESS=$(echo "$RESPONSE" | jq -r '.data.[mutation_name].success // empty')
if [ "$SUCCESS" != "true" ]; then
  ERROR=$(echo "$RESPONSE" | jq -r '.errors[0].message // "Unknown error"')
fi
```

### Extract fields:
```bash
# Issue creation
IDENTIFIER=$(echo "$RESPONSE" | jq -r '.data.issueCreate.issue.identifier')
UUID=$(echo "$RESPONSE" | jq -r '.data.issueCreate.issue.id')
URL=$(echo "$RESPONSE" | jq -r '.data.issueCreate.issue.url')

# Handle null values
VALUE=$(echo "$RESPONSE" | jq -r '.data.field // "default"')
```

### Loop through arrays:
```bash
echo "$RESPONSE" | jq -r '.data.issues.nodes[] | .identifier'
```

### Filter with select:
```bash
# Find specific item
echo "$LABELS_JSON" | jq -r '.[] | select(.name=="bug") | .id'
```

---

## Logging

For debugging, log API calls to stderr:

```bash
# Log to stderr (won't interfere with JSON output)
echo "[Linear API] Creating issue: $TITLE" >&2

RESPONSE=$(curl -s ...)

# Log errors
if [ "$(echo "$RESPONSE" | jq -r '.errors // empty')" != "" ]; then
  echo "[Linear API] Error: $(echo "$RESPONSE" | jq -r '.errors[0].message')" >&2
fi
```
