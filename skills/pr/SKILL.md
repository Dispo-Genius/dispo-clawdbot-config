---
name: pr
description: Create a PR for review. Triggers on "create pr", "open pr". Use /merge to merge after review.
---

# PR Skill

<instructions>
## When to Use

- After committing changes, when ready for review
- When user asks to "create PR" or "open PR"

## Invocation

- `/pr` - Create PR and wait for checks (does NOT auto-merge)
- `/pr --draft` - Create as draft PR
- `/merge` or `/pr --merge` - Merge an existing PR after review
</instructions>

---

## Process Overview

**Creating PR (`/pr`):**

| Step | Purpose |
|------|---------|
| 1 | Pre-flight checks |
| 2 | Create PR |
| 3 | Wait for checks |
| 4 | **STOP** - User reviews |

**Merging (`/merge` or `/pr --merge`):**

| Step | Purpose |
|------|---------|
| 1 | Merge PR |
| 2 | Sync branch to main |
| 3 | Verify Vercel deployment |

---

<procedure>

<step n="1" name="Pre-flight Checks">
```bash
# Check for uncommitted changes
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github status
```

<gate>
| Condition | Action |
|-----------|--------|
| Uncommitted changes | Ask: "You have uncommitted changes. Run `/commit` first?" |
| On main/master | Error: "Already on main branch. Nothing to merge." |
| No commits ahead of main | Error: "Branch has no new commits to merge." |
</gate>

```bash
# Ensure branch is pushed
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github push origin HEAD
```
</step>

---

<step n="2" name="Create PR">
Generate PR title and body from commit history:

```bash
# Get commits since branching from main
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github log main..HEAD
```

Create PR using github-cc:

```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github pr-create \
  --title "{type}: {summary from commits}" \
  --body "$(cat <<'EOF'
## Summary
{bullet points from commit messages}

## Test Plan
- [ ] Typecheck passes
- [ ] Build passes
- [ ] Manual verification

Implements {LINEAR_ISSUE_IDENTIFIER}
EOF
)" \
  --base main
```

**If `--draft` flag:** Add `--draft` to pr-create command, then STOP here.
</step>

---

<step n="3" name="Wait for Checks">
```bash
# Get PR number from create output, then check status
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github pr-checks {PR_NUMBER}
```

<gate>
| Status | Action |
|--------|--------|
| All passing | Report success, **STOP** for user review |
| Pending | Wait and re-check (max 3 attempts, 30s apart) |
| Failing | Show failures, ask user how to proceed |
</gate>

**Default behavior STOPS here.** User reviews PR, then runs `/merge` when ready.
</step>

---

<step n="4" name="Merge (only with --merge flag)">
**Only run this step if user invoked `/merge` or `/pr --merge`.**
```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github pr-merge {PR_NUMBER} --squash
```

<gate>
| Result | Action |
|--------|--------|
| Merge conflict | Show conflict details, ask user to resolve |
| Success | Proceed to sync |
</gate>
</step>

---

<step n="5" name="Sync Branch to Main">
After squash merge, your branch has old commits while main has the squashed version.
Reset your branch to match main exactly by **deleting and recreating from main**:

```bash
# Store branch name, switch to main
BRANCH_NAME={current_branch}
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github branch main

# Delete local branch and recreate from main
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github branch -D {BRANCH_NAME}
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github branch {BRANCH_NAME} -b

# Force push to sync remote branch
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github push origin {BRANCH_NAME} --force
```

**Verify sync** - both commands should return `log[0]:empty`:
```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github log main..{BRANCH_NAME}
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github log {BRANCH_NAME}..main
```

<gate>
| Result | Action |
|--------|--------|
| Both empty | Sync confirmed |
| Either has commits | Sync failed - retry delete/recreate |
</gate>

**Why delete/recreate instead of rebase:** After squash merge, main has a NEW commit that doesn't exist in your branch history. Rebasing doesn't help because git can't find a common ancestor. Delete/recreate is the only reliable way.
</step>

---

<step n="6" name="Verify Vercel Deployment">
After merge, check that Vercel production deployment succeeded:

```bash
# Wait for deployment to start (Vercel triggers on main push)
sleep 10

# Check latest workflow run on main
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github run-list --branch main --limit 1
```

<gate>
| Status | Action |
|--------|--------|
| success/completed | Done |
| in_progress/queued | Wait 30s and re-check (max 5 attempts) |
| failure | Show error, ask: "Vercel build failed. Check logs?" |
</gate>

If build failed, get details:
```bash
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github run-view {RUN_ID}
```
</step>

</procedure>

---

## Report Templates

**After `/pr` (PR created, awaiting review):**
```
PR created and ready for review

**PR:** #{PR_NUMBER}
**URL:** {PR_URL}
**Branch:** {branch_name}
**Checks:** ✓ passing

Run `/merge` when ready to merge.
```

**After `/merge` (PR merged):**
```
PR merged and synced

**PR:** #{PR_NUMBER}
**Branch:** {branch_name} (synced with main)
**Commits:** {commit_count} squashed
**Vercel:** ✓ deployed
```

---

<guidelines name="edge-cases">
## Edge Cases

### Merge Conflicts

If merge fails due to conflicts:
1. Show the conflicting files
2. Ask user: "Resolve conflicts locally and re-run `/pr`, or close PR?"

### CI Failures

If checks fail:
1. Show which checks failed
2. Ask user: "Fix issues and push, or merge anyway?"

### Already Has Open PR

If branch already has an open PR:
1. Show existing PR details
2. Ask: "Update existing PR or create new one?"

### Sync Fails

If sync step fails (e.g., log commands show commits):
1. The PR is already merged - main is fine
2. Retry the delete/recreate approach:
   ```bash
   npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github branch main
   npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github branch -D {BRANCH}
   npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github branch {BRANCH} -b
   npx tsx ~/.claude/services/gateway-cc/src/index.ts exec github push origin {BRANCH} --force
   ```

### Vercel Build Fails After Merge

If Vercel deployment fails on main:
1. PR is already merged - can't undo easily
2. Show the build error from `run-view`
3. Options:
   - Fix forward: commit a fix and push to main
   - Rollback: revert the squash commit on main (rare, ask user first)
4. Check Vercel dashboard for more details: https://vercel.com/dispo-genius/dg-prototype-v2
</guidelines>

---

<references>
## Related Skills

| Skill | When |
|-------|------|
| `/commit` | Stage, commit, and push changes first |
| `/merge` | Merge PR after review (same as `/pr --merge`) |
| `/manage-linear` | Link or create tickets |
</references>
