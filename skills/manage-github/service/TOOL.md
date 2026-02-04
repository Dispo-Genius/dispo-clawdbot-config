# github-cc

CLI reference for `github-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `sync` | Sync repository metadata and verify |
| `pr-view` | View a pull request |
| `pr-list` | List pull requests |
| `pr-create` | Create a pull request |
| `pr-review` | Review a pull request |
| `pr-merge` | Merge a pull request |
| `pr-close` | Close a pull request |
| `pr-checks` | View PR check status |
| `issue-view` | View an issue |
| `issue-list` | List issues |
| `comments` | View comments on a PR or issue |
| `status` | One-line git status summary |
| `diff` | Show diff (use --stat for compact stats) |
| `conflicts` | List conflicted files with line numbers |
| `fetch` | Fetch and rebase from target branch |
| `rebase` | Rebase with conflict summary |
| `resolve` | Show conflict markers for a file |
| `stage` | Stage files and confirm |
| `abort` | Abort current rebase or merge operation |
| `stash` | Stash or restore changes |
| `commit` | Commit staged changes |
| `push` | Push commits to remote |
| `log` | Show commit history |
| `branch` | List, create, or switch branches |

---

## sync

Sync repository metadata and verify

```bash
github-cc sync [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-view

View a pull request

```bash
github-cc pr-view [options] <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `number` | Yes | PR number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--comments` | No | Include comments |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-list

List pull requests

```bash
github-cc pr-list [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--state <state>` | Yes | Filter by state: open, closed, merged, all (default: |
| `--author <author>` | Yes | Filter by author |
| `--label <label>` | Yes | Filter by label |
| `--limit <limit>` | No | Max PRs to return (default: 20) |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-create

Create a pull request

```bash
github-cc pr-create [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--title <title>` | Yes | PR title |
| `--body <body>` | Yes | PR body |
| `--base <base>` | No | Base branch (default: repo default branch) |
| `--head <head>` | No | Head branch (default: current branch) |
| `--draft` | No | Create as draft PR |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-review

Review a pull request

```bash
github-cc pr-review [options] <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `number` | Yes | PR number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--approve` | No | Approve the PR |
| `--comment` | No | Add a comment review |
| `--request-changes` | No | Request changes |
| `--body <body>` | Yes | Review body/comment |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-merge

Merge a pull request

```bash
github-cc pr-merge [options] <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `number` | Yes | PR number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--squash` | No | Squash and merge |
| `--merge` | No | Create a merge commit |
| `--rebase` | No | Rebase and merge |
| `--delete-branch` | No | Delete the branch after merging |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-close

Close a pull request

```bash
github-cc pr-close [options] <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `number` | Yes | PR number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--delete-branch` | No | Delete the branch after closing |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## pr-checks

View PR check status

```bash
github-cc pr-checks [options] <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `number` | Yes | PR number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--required` | No | Show only required checks |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## issue-view

View an issue

```bash
github-cc issue-view [options] <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `number` | Yes | Issue number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--comments` | No | Include comments |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## issue-list

List issues

```bash
github-cc issue-list [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--state <state>` | No | Filter by state: open, closed, all (default: open) |
| `--assignee <assignee>` | Yes | Filter by assignee |
| `--label <label>` | Yes | Filter by label |
| `--limit <limit>` | No | Max issues to return (default: 20) |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## comments

View comments on a PR or issue

```bash
github-cc comments [options] <type> <number>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `type` | Yes | Type: pr or issue |
| `number` | Yes | PR or issue number |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--limit <limit>` | No | Max comments to return (default: 50) |
| `--repo <repo>` | Yes | Repository in owner/repo format |

---

## status

One-line git status summary

```bash
github-cc status [options]
```

---

## diff

Show diff (use --stat for compact stats)

```bash
github-cc diff [options] [target]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `target` | Yes | Target branch/commit to diff against |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--stat` | No | Show only stats (compact) |
| `--staged` | No | Show staged changes |

---

## conflicts

List conflicted files with line numbers

```bash
github-cc conflicts [options]
```

---

## fetch

Fetch and rebase from target branch

```bash
github-cc fetch [options] <branch>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `branch` | Yes | Branch to sync from (e.g., origin/main) |

---

## rebase

Rebase with conflict summary

```bash
github-cc rebase [options] <branch>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `branch` | Yes | Branch to rebase onto |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--continue` | No | Continue rebase after resolving conflicts |

---

## resolve

Show conflict markers for a file

```bash
github-cc resolve [options] <file>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `file` | Yes | File to show conflicts for |

---

## stage

Stage files and confirm

```bash
github-cc stage [options] <files...>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `files` | Yes | Files to stage |

---

## abort

Abort current rebase or merge operation

```bash
github-cc abort [options]
```

---

## stash

Stash or restore changes

```bash
github-cc stash [options] [action]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `action` | Yes | Action: push (default), pop, list, drop (default: |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-m, --message <message>` | Yes | Stash message |

---

## commit

Commit staged changes

```bash
github-cc commit [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-m, --message <message>` | Yes | Commit message |
| `--amend` | No | Amend the previous commit |

---

## push

Push commits to remote

```bash
github-cc push [options] [remote] [branch]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `remote` | Yes | Remote name (default: "origin") |
| `branch` | Yes | Branch name (defaults to current) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-u, --set-upstream` | No | Set upstream tracking |
| `-f, --force` | No | Force push (use with caution) |
| `--force-with-lease` | No | Force push with lease (safer) |

---

## log

Show commit history

```bash
github-cc log [options] [range]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `range` | Yes | Commit range (e.g., main..HEAD) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-n, --count <number>` | No | Number of commits to show (default: 10) |
| `--oneline` | No | Show condensed output |

---

## branch

List, create, or switch branches

```bash
github-cc branch [options] [name]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Branch name (omit to list branches) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-b, --create` | No | Create new branch |
| `-d, --delete` | No | Delete branch |
| `-D, --force-delete` | No | Force delete branch |
| `-a, --all` | No | List all branches (including remote) |

---
