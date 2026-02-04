---
name: manage-github
description: GitHub + Git integration via CLI. Triggers on "create pr", "github", "issue", "pr checks".
metadata: {"clawdbot":{"emoji":"🐙"}}
---

# GitHub + Git Operations

Use the `github` service via gateway-cc for all GitHub and Git operations.

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github <command> [options]
```

## Commands

### status
Show git status (branch, changes, remote tracking).
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github status
```

### diff
Show changes.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github diff
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github diff --staged
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github diff --stat
```
**Options:** `--staged`, `--stat`

### log
Show commit history.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github log
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github log --oneline --limit 10
```
**Options:** `--oneline`, `--limit <N>`

### fetch
Fetch from remote.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github fetch
```

### rebase
Rebase current branch.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github rebase
```

### stash
Stash or pop changes.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github stash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github stash pop
```

### stage
Stage files for commit.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github stage <files...>
```

### commit
Create a commit.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github commit "commit message"
```

### push
Push to remote.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github push
```

### pr-create
Create a pull request.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-create --title "PR title" --body "Description"
```
**Required:** `--title`, `--body`
**Options:** `--base <branch>`, `--draft`

### pr-view
View a pull request.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-view 123
```

### pr-edit
Edit a pull request.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-edit 123 --title "New title"
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-edit 123 --body "New description"
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-edit 123 --add-label bug --add-label urgent
```
**Options:** `--title`, `--body`, `--add-label`, `--remove-label`

### pr-list
List open pull requests.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-list
```

### pr-checks
View CI check status for a PR.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-checks 123
```

### pr-merge
Merge a pull request.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-merge 123
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github pr-merge 123 --squash --delete-branch
```
**Options:** `--squash`, `--delete-branch`

### issue-view
View an issue.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github issue-view 42
```

### issue-list
List issues.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github issue-list
```

### comments
View PR/issue comments.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github comments 123
```

### run-list
List workflow runs.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github run-list

# Options
--limit <n>          Max runs to return (default 20)
--status <status>    Filter: queued, in_progress, completed, failure, success
--workflow <name>    Filter by workflow name

# Example
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github run-list --status failure --limit 5
```

### run-view
View workflow run details and failed job logs.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github run-view <run-id>

# Example
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github run-view 12345678
```

### api
Raw `gh api` passthrough for any GitHub API endpoint.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github api <endpoint>

# Options
--method <method>    HTTP method (default GET)
--field <key=value>  Request body fields (repeatable)

# Examples
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github api repos/andyrong123/dg-prototype/actions/runs
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec github api repos/andyrong123/dg-prototype/dispatches --method POST --field event_type=deploy
```

---

## Related Skills

| Skill | When |
|-------|------|
| `/commit` | Full commit workflow (stage, commit, push) |
| `/pr` | Full PR workflow (create, merge) |
