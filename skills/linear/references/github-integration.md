# GitHub Integration Setup

Configure Linear to auto-update issue status based on GitHub PR activity.

---

## Setup Steps

### 1. Connect GitHub to Linear

1. Go to Linear **Settings** → **Integrations** → **GitHub**
2. Click **Connect GitHub**
3. Authorize Linear for your organization
4. Select repositories to sync

### 2. Configure Auto-Status Updates

In Linear **Settings** → **Integrations** → **GitHub** → **Workflow Automations**:

| GitHub Event | Linear Status | Notes |
|--------------|---------------|-------|
| Branch created/copied | **In Progress** | When you copy the git branch name from Linear |
| PR opened | **In Review** | Draft PRs optional |
| PR merged | **Done** | Main trigger for completion |
| PR closed (not merged) | *No change* | Or revert to Todo |

### 3. Branch Naming Convention

Linear auto-links PRs when the branch name includes the issue ID:

```
{prefix}/{issue-id}-{slug}
```

**Examples:**
- `fix/pro-123-login-redirect`
- `feature/pro-456-dark-mode`
- `refactor/pro-789-auth-middleware`

**Prefixes by issue type:**

| Type | Prefix |
|------|--------|
| Bug | `fix/` |
| Feature | `feature/` |
| Improvement | `improve/` |
| Refactor | `refactor/` |

### 4. PR Description Linking

Include the issue ID in PR description for auto-linking:

```markdown
Fixes PRO-123

## Summary
- What changed

## Test Plan
- How to verify
```

**Magic keywords:**
- `Fixes PRO-123` - Marks as Done when merged
- `Closes PRO-123` - Same as Fixes
- `Relates to PRO-123` - Links without status change

---

## Verification

After setup, test the integration:

1. Create a test issue in Linear
2. Copy the branch name (Linear provides this)
3. Create branch locally: `git checkout -b fix/pro-xxx-test`
4. Verify issue moves to **In Progress**
5. Open a PR with the branch
6. Verify issue moves to **In Review**
7. Merge the PR
8. Verify issue moves to **Done**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Status not updating | Check branch includes issue ID (e.g., `pro-123`) |
| Wrong issue linked | Ensure only one issue ID in branch name |
| Integration disconnected | Re-authorize in Settings → Integrations |
| PR not linking | Include issue ID in PR title or description |

---

## Team Settings

Each Linear team can have different automation rules:

1. Go to **Team Settings** → **GitHub**
2. Configure per-team branch patterns
3. Set target branch rules (e.g., only `main` merges mark as Done)

---

## Current Status

- [ ] GitHub connected to Linear workspace
- [ ] Auto-status rules configured
- [ ] Team aware of branch naming convention
- [ ] Tested end-to-end flow
