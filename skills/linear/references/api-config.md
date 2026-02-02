# Linear API Configuration

## Endpoint

```
https://api.linear.app/graphql
```

## Authentication

**Environment Variable:** `LINEAR_API_KEY`

The API key is ALREADY SET in the environment. Just use it directly.

---

## ⚠️ CRITICAL: How to Make API Calls

**For complex queries with nested fields or special characters, ALWAYS use the temp file pattern.**

### ✅ CORRECT - Temp file pattern (REQUIRED for complex queries)

```bash
TMPFILE=$(mktemp)
echo '{"query":"query{team(id:\"05e533b4-661d-43df-84af-bec6f6c38f65\"){issues{nodes{id title}}}}"}' > "$TMPFILE"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d @"$TMPFILE" https://api.linear.app/graphql
rm "$TMPFILE"
```

### ✅ CORRECT - Simple queries only (viewer, single field)

```bash
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d '{"query":"query{viewer{name}}"}' https://api.linear.app/graphql
```

### ❌ WRONG - Complex JSON inline (causes auth failures)

```bash
# This FAILS with "Authentication required" due to shell escaping issues
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d '{"query": "query { team(id: \"...\") { issues { nodes { id } } } }"}' https://api.linear.app/graphql
```

### ❌ WRONG - Multiline with backslashes

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{"query": "..."}' \
  https://api.linear.app/graphql
```

### ❌ WRONG - Reading from .env (permission denied)

```bash
grep LINEAR_API_KEY .env  # Security rule blocks this
```

**Rule of thumb:** If your query has nested `{}` braces, UUIDs, or special characters - USE THE TEMP FILE PATTERN.

---

Note: Personal API keys use `Authorization: <API_KEY>` (NO "Bearer" prefix).

### Setup for New Team Members (One-Time)

1. Go to https://linear.app/settings/account/security
2. Create a personal API key with read/write access
3. Add to shell profile:
   ```bash
   echo 'export LINEAR_API_KEY="lin_api_XXXXX"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. Verify (single line!):
   ```bash
   curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d '{"query": "query { viewer { name email } }"}' https://api.linear.app/graphql
   ```

**Note:** Each team member needs their own API key. Keys are personal and tied to your Linear account.

---

## Team Resolution

### Step 1: Read from CLAUDE.md

Parse CLAUDE.md for team instruction (case-insensitive):
```
use team: {TEAM_NAME}
```

### Step 2: If Not Found, Ask User

If no team instruction in CLAUDE.md:
```
Which Linear team should issues be created in?
```
Use AskUserQuestion with available teams.

### Step 3: Lookup Team ID

Query if team not in cache:
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{"query": "query { teams { nodes { id name } } }"}' \
  https://api.linear.app/graphql | jq -r '.data.teams.nodes[] | select(.name=="TEAM_NAME") | .id'
```

---

## Default Behaviors

### Project Requirement
Every issue must be associated with a Linear project. When creating issues, you will be prompted to select a project or create a new one.

### Auto-Assignment
Issues are automatically assigned to the current user (whoever runs the command) unless:
- `--assignee <name>` is specified → assigns to that person
- `--unassigned` flag is used → leaves issue unassigned

This uses the `viewer` query to determine the current user based on the LINEAR_API_KEY.

---

## Rate Limits

- API Key auth: 1,500 requests/hour per user
- Complexity limit: 250,000 points/hour
- At ~25 requests/minute, this is generous for development workflows

---

## Cached IDs

### Teams

| Team Name | Team ID |
|-----------|---------|
| PROTOTYPE | `05e533b4-661d-43df-84af-bec6f6c38f65` |
| Frontend Engineering | `c9c8376e-7fd3-4921-9996-8c98fc2274f2` |
| Backend Engineering | `73c38bb9-46d4-45c6-a970-6800214a15a2` |
| Historical Data | `a932029a-3599-4324-81e4-88244a5e9cbf` |

To add new team, run:
```bash
TMPFILE=$(mktemp)
echo '{"query":"query{teams{nodes{id name}}}"}' > "$TMPFILE"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d @"$TMPFILE" https://api.linear.app/graphql | jq '.data.teams.nodes'
rm "$TMPFILE"
```

---

### Workflow States (PROTOTYPE)

| State | ID | Type |
|-------|-----|------|
| Backlog | `65e00fdc-484f-4c45-9fa9-a51c9c630405` | backlog |
| Todo | `348e09d9-9060-42b8-bb32-dfdbdd56cacc` | unstarted |
| In Progress | `b4f02fc8-e392-4a23-9fb4-e0b349c06762` | started |
| In Review | `537e67ad-2afb-484a-81e6-bd64f525f88f` | started |
| Done | `bba01b99-400e-4fa8-aa16-fff9e37c10d5` | completed |
| Canceled | `57e9dd17-f7f7-41b9-ad9f-adfe7fc220ec` | canceled |
| Duplicate | `fc415c02-ed7e-43ee-a50b-a5ee06817930` | canceled |

To refresh states for a team:
```bash
TMPFILE=$(mktemp)
echo '{"query":"query{team(id:\"05e533b4-661d-43df-84af-bec6f6c38f65\"){states{nodes{id name type}}}}"}' > "$TMPFILE"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d @"$TMPFILE" https://api.linear.app/graphql | jq '.data.team.states.nodes'
rm "$TMPFILE"
```

---

### Labels

| Label | ID |
|-------|-----|
| Bug | `30f21781-8869-4a62-b73d-2b1d5c5f82d3` |
| Feature | `cc19d7d1-e527-49c8-a01f-76c649d3ed5b` |
| Improvement | `6043177a-9001-468f-a598-557d17ade37d` |
| spec | `cb43bd02-9f5c-4148-a27f-e36f193fa8a8` |
| ui | `289db0be-5f38-4230-9fad-d3ceb3c88f1a` |
| ux | `83a20f96-6adb-4b7d-affc-ff613646b820` |

**Label Usage:**
- `Bug`, `Feature`, `Improvement` - Issue type (mutually exclusive)
- `spec` - Specification document
- `ui` - Affects visual/UI components
- `ux` - Affects user flows/interactions

To refresh labels:
```bash
TMPFILE=$(mktemp)
echo '{"query":"query{issueLabels(first:100){nodes{id name}}}"}' > "$TMPFILE"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d @"$TMPFILE" https://api.linear.app/graphql | jq '.data.issueLabels.nodes'
rm "$TMPFILE"
```

---

### Team Members

See `.claude/team.yaml` for current team members and their Linear user IDs.

To refresh team members:
```bash
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d '{"query": "query { team(id: \"05e533b4-661d-43df-84af-bec6f6c38f65\") { members { nodes { id name } } } }"}' https://api.linear.app/graphql
```

---

### Initiatives

| Initiative Name | Initiative ID |
|-----------------|---------------|
| V2 Dispo Genius | `8276ca26-01f0-477b-86a5-0b8c1fec2010` |
| Developer Tooling | `d19ab000-b8d6-4300-8621-a4cf50e5bbc4` |

To list initiatives:
```bash
TMPFILE=$(mktemp)
echo '{"query":"query{initiatives(first:20){nodes{id name}}}"}' > "$TMPFILE"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d @"$TMPFILE" https://api.linear.app/graphql | jq '.data.initiatives.nodes'
rm "$TMPFILE"
```

---

### Projects

**V2 Dispo Genius Initiative:**

| Project Name | Project ID |
|--------------|------------|
| Investors Tab | `ff512472-bfee-4042-9f7a-63de694ddf09` |
| Deals Board | `6c425478-304f-4032-8c48-db76b1e5f15d` |
| Home Dashboard | `338888a0-c70a-4fee-9df3-da8d49682e5a` |
| Website and Marketing | `4425d888-be6c-4187-b5cb-3b79c1a4ec45` |
| Settings | `3060cefd-d5f1-4d72-991a-f120ae0654c2` |
| Design Studio | `764e3628-8935-48ba-94b9-8d8da89aed36` |
| Global Features | `020bd523-b70b-4501-b645-aa530e4e1473` |

**Developer Tooling Initiative:**

| Project Name | Project ID |
|--------------|------------|
| Claude Code Skills | `9b6be4ea-87ec-4f56-9950-17fe6f25eec1` |
| Code Quality Agents | `c18de45a-1918-4b7e-a790-10b974d5b63f` |
| DX Improvements | `6850d4c9-89b2-4d3d-ae3a-d64f75b930b2` |

**Other Projects (PROTOTYPE team):**

| Project Name | Project ID |
|--------------|------------|
| Prototype Enhancements | `a2bd167b-b1c6-472d-a902-27313dd8f77d` |
| Property Data Aggregation - Phase 1 | `b3667d3c-c82e-4124-9af8-38f4f58c312a` |

To refresh projects:
```bash
TMPFILE=$(mktemp)
echo '{"query":"query{team(id:\"05e533b4-661d-43df-84af-bec6f6c38f65\"){projects{nodes{id name}}}}"}' > "$TMPFILE"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d @"$TMPFILE" https://api.linear.app/graphql | jq '.data.team.projects.nodes'
rm "$TMPFILE"
```

---

### Current User

Resolved dynamically via `viewer` query:

```bash
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_KEY" -d '{"query":"query{viewer{id name email}}"}' https://api.linear.app/graphql | jq '.data.viewer'
```

The user ID from this query is used for `assigneeId` in issue creation.
