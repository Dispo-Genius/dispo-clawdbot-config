# GraphQL Operations

All 7 Linear API operations with complete curl templates.

---

## create_issue

Create a new Linear issue.

```bash
API_KEY="$LINEAR_API_KEY"
TEAM_ID="[FROM api-config.md]"

# Required: teamId, title
# Optional: description, assigneeId, labelIds[], stateId, projectId, priority

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }",
    "variables": {
      "input": {
        "teamId": "'"$TEAM_ID"'",
        "title": "[BUG] Example title",
        "description": "Detailed description in markdown",
        "labelIds": ["label-uuid-1", "label-uuid-2"],
        "assigneeId": "user-uuid"
      }
    }
  }' \
  https://api.linear.app/graphql
```

**Extract results:**
```bash
# ... | jq -r '.data.issueCreate.issue.identifier'  # e.g., "DIS-47"
# ... | jq -r '.data.issueCreate.issue.id'          # UUID
# ... | jq -r '.data.issueCreate.issue.url'         # Full URL
```

---

## update_issue

Update an existing issue (status, title, labels, etc.).

```bash
API_KEY="$LINEAR_API_KEY"
ISSUE_ID="DIS-47"  # Can be identifier or UUID

# Optional fields: title, description, stateId, labelIds[], assigneeId

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title state { id name } } } }",
    "variables": {
      "id": "'"$ISSUE_ID"'",
      "input": {
        "stateId": "in-progress-state-uuid"
      }
    }
  }' \
  https://api.linear.app/graphql
```

**Common status updates:**
```bash
# Set to "In Progress"
"stateId": "b4f02fc8-e392-4a23-9fb4-e0b349c06762"

# Set to "Done"
"stateId": "bba01b99-400e-4fa8-aa16-fff9e37c10d5"
```

---

## create_comment

Post a comment on an issue.

```bash
API_KEY="$LINEAR_API_KEY"
ISSUE_UUID="[issue-uuid]"  # Must be UUID, not identifier like DIS-47

# Escape newlines in body: use \\n for literal \n in JSON
COMMENT_BODY="## Progress Update\\n\\nCompleted task X.\\n\\n---\\n*Auto-update by Claude*"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "mutation CommentCreate($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id } } }",
    "variables": {
      "input": {
        "issueId": "'"$ISSUE_UUID"'",
        "body": "'"$COMMENT_BODY"'"
      }
    }
  }' \
  https://api.linear.app/graphql
```

**Note:** `issueId` must be UUID. Get it from `get_issue` first if you only have the identifier.

---

## list_issues

Query issues with filters.

```bash
API_KEY="$LINEAR_API_KEY"
TEAM_ID="[FROM api-config.md]"

# Basic: all issues for team
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "query { team(id: \"'"$TEAM_ID"'\") { issues(first: 50) { nodes { id identifier title state { name } labels { nodes { name } } } } } }"
  }' \
  https://api.linear.app/graphql

# With filters: approved specs in Todo state
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "query FilteredIssues($filter: IssueFilter) { issues(filter: $filter, first: 50) { nodes { id identifier title description state { name } labels { nodes { name } } } } }",
    "variables": {
      "filter": {
        "team": { "id": { "eq": "'"$TEAM_ID"'" } },
        "state": { "name": { "eq": "Todo" } },
        "labels": { "name": { "eq": "spec" } }
      }
    }
  }' \
  https://api.linear.app/graphql
```

---

## get_issue

Fetch single issue details.

```bash
API_KEY="$LINEAR_API_KEY"
ISSUE_ID="DIS-47"  # Can be identifier or UUID

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "query Issue($id: String!) { issue(id: $id) { id identifier title description url state { id name type } labels { nodes { id name } } assignee { id name email } project { id name } } }",
    "variables": {
      "id": "'"$ISSUE_ID"'"
    }
  }' \
  https://api.linear.app/graphql
```

**Extract fields:**
```bash
# ... | jq -r '.data.issue.id'           # UUID (needed for comments)
# ... | jq -r '.data.issue.identifier'   # DIS-47
# ... | jq -r '.data.issue.state.name'   # "Todo", "In Progress", etc.
# ... | jq -r '.data.issue.url'          # Full Linear URL
```

---

## list_issue_labels

Get available labels for issue creation.

```bash
API_KEY="$LINEAR_API_KEY"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "query Labels { issueLabels(first: 100) { nodes { id name color } } }"
  }' \
  https://api.linear.app/graphql
```

**Extract as lookup:**
```bash
# ... | jq -r '.data.issueLabels.nodes[] | "\(.name)\t\(.id)"'
```

---

## create_project

Create a new project.

```bash
API_KEY="$LINEAR_API_KEY"
TEAM_ID="[FROM api-config.md]"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $API_KEY" \
  -d '{
    "query": "mutation ProjectCreate($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }",
    "variables": {
      "input": {
        "name": "Project Name",
        "teamIds": ["'"$TEAM_ID"'"],
        "description": "Project description in markdown",
        "targetDate": "2025-03-01"
      }
    }
  }' \
  https://api.linear.app/graphql
```

**Extract results:**
```bash
# ... | jq -r '.data.projectCreate.project.id'
# ... | jq -r '.data.projectCreate.project.url'
```
