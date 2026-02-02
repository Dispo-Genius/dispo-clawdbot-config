---
name: contribute
description: Contribute improvements back to team config via PR. Triggers on "contribute", "push config", "share skill", "share tool", "config pr", "contribute sync".
---

# Contribute

Share skills, tools, or improvements with the team via PR to the central config repo.

## Commands

| Command | Description |
|---------|-------------|
| `/contribute` | Interactive contribution of single item |
| `/contribute sync` | Detect and sync all uncontributed items |
| `/contribute <item-name>` | Contribute specific item directly |

## When to Use

- Created a useful new skill or tool
- Improved an existing item
- Fixed a bug in shared config
- Added a new agent or reference
- Need to sync local items to team repos

---

## Target Repos

| Repo | Purpose | Items |
|------|---------|-------|
| `Dispo-Genius/dispo-claude-config` | Claude Code config | Skills, agents, hooks |
| `Dispo-Genius/dispo-clawdbot-config` | OpenClaw/Clawdbot | Services, universal skills |

### Routing Rules (Priority Order)

| # | Item Type | Condition | Target |
|---|-----------|-----------|--------|
| 1 | Service (`~/.claude/services/*`) | Always | clawdbot-config |
| 2 | Hook (`~/.claude/hooks/*`) | Always | claude-config |
| 3 | Universal Skill | Name matches universal list | **BOTH** repos |
| 4 | Skill | Has `metadata.clawdbot: true` | clawdbot-config |
| 5 | Skill | Has `metadata.claude-code-only: true` | claude-config only |
| 6 | Skill | No metadata (default) | claude-config |

### Universal Skills (Auto-Both)

These skills are useful to both Claude Code users AND Polaris/OpenClaw. They route to **both** repos by default:

```
# Core workflows
reasoning, deep-research, checkpoint, use-llms

# Git/GitHub
commit, pr, manage-github

# Integrations that both products use
manage-linear, manage-slack, manage-gmail

# Config management
optimize-claude, contribute, authoring-claude
```

**Detection:** If skill name matches this list, recommend "Both" as default target.

---

## Workflow: Single Item (`/contribute`)

**Uses TaskCreate/TaskUpdate to track progress.**

### Phase 1: Scout Detection

Create task and detect what's being contributed:

```
TaskCreate: "Contribute item to team config"
Description: "Detect, validate, and PR item to appropriate repo(s)"
```

```bash
# List modified items in ~/.claude
cd ~/.claude && npx tsx ~/.claude/services/github-cc/src/index.ts status
```

**Routing Detection (in priority order):**

1. **Service?** (`~/.claude/services/*`) → clawdbot-config
2. **Hook?** (`~/.claude/hooks/*`) → claude-config
3. **Universal skill?** (name in universal list) → **BOTH** (recommend)
4. **Has `metadata.clawdbot: true`?** → clawdbot-config
5. **Has `metadata.claude-code-only: true`?** → claude-config only
6. **Default** → claude-config

---

### Phase 2: Interview

Use AskUserQuestion for structured interview:

**Question 1: What type?**
```
What are you contributing?
- Skill (workflow/process)
- Service (-cc tool in ~/.claude/services/)
- Agent (Task tool config)
- Hook (pre/post command hooks)
- Improvement (existing item update)
```

**Question 2: Which item?**
```
Which specific item? (show list of local changes)
```

**Question 3: Why share?**
```
Why share this with the team?
- Generally useful across projects
- Fixes a bug others might hit
- Improves existing functionality
- Standardizes a common workflow
```

**Question 4: Who benefits?**
```
Which roles would use this?
- All team members
- Frontend developers
- Backend developers
- Designers
- ML engineers
```

**Question 5: Dependencies?**
```
Does this require other items?
- No dependencies
- Requires specific tool (which?)
- Requires other skill (which?)
- Has external dependencies
```

**Question 6: Target repo** (based on scout)

For universal skills, default to "Both":
```
Scout detected: Universal skill (matches: reasoning, deep-research, etc.)
Recommended: Both repos

Confirm target:
- Both repos (Recommended) - Available to Claude Code AND Polaris
- Claude Code only (dispo-claude-config)
- Polaris only (dispo-clawdbot-config)
```

For non-universal skills:
```
Scout detected: {Claude Code | Polaris}

Confirm target:
- {Detected option} (Recommended)
- Both repos
- {Other option}
```

---

### Phase 3: Quality Gate

Validate before PR:

| # | Check | Command |
|---|-------|---------|
| 1 | SKILL.md exists | `test -f ~/.claude/{type}/{name}/SKILL.md` |
| 2 | Valid frontmatter | Has `name:` and `description:` |
| 3 | No hardcoded paths | `grep -r "/Users/" ~/.claude/{type}/{name}` empty |
| 4 | No secrets | No API keys, tokens, passwords |
| 5 | Reasonable size | < 300 lines for SKILL.md |
| 6 | Trigger keywords | Description includes trigger words |
| 7 | Target repo exists | Pre-flight clone check |

**Output format:**
```
Quality Gate Results:

✓ SKILL.md exists
✓ Valid frontmatter
✓ No hardcoded paths
✓ No secrets detected
✓ Size: 87 lines (< 300)
✓ Trigger keywords defined
✓ Target repo accessible

Ready to create PR.
```

**If validation fails:**
```
Quality Gate Failed:

✗ Hardcoded paths found:
  Line 42: /Users/andyrong/.claude/tools/...

Fix these issues before contributing.
Replace: /Users/andyrong/ → ~/
```

---

### Phase 4: Staging & PR Creation

Clone to temp, copy contribution, create PR:

```bash
# Setup staging area
STAGING="/tmp/contribute-$(date +%s)"
mkdir -p $STAGING

# Clone target repo
gh repo clone Dispo-Genius/<target-repo> $STAGING/<repo>

# Copy contribution (preserve structure)
cp -r ~/.claude/{type}/{name} $STAGING/<repo>/{type}/

# Create branch, commit, push, PR
cd $STAGING/<repo>
```

Then use github-cc for git operations:

```bash
cd $STAGING/<repo>
npx tsx ~/.claude/services/github-cc/src/index.ts checkout -b contrib/{name}
npx tsx ~/.claude/services/github-cc/src/index.ts stage {type}/{name}/
npx tsx ~/.claude/services/github-cc/src/index.ts commit -m "feat({type}): Add {name}

{interview summary}

Roles: {roles}
Dependencies: {deps}"
npx tsx ~/.claude/services/github-cc/src/index.ts push -u origin contrib/{name}
```

Create PR via gh:
```bash
gh pr create \
  --repo Dispo-Genius/<target-repo> \
  --title "feat({type}): Add {name}" \
  --body "## Contribution

**Type:** {type}
**Item:** {name}
**Roles:** {roles}

## Why Share
{reason}

## Dependencies
{deps}

## Quality Gate
- [x] SKILL.md exists
- [x] Valid frontmatter
- [x] No hardcoded paths
- [x] No secrets
- [x] Size within limits

---
Contributed via \`/contribute\`"
```

### Phase 5: Dual-Repo Handling

When "Both" is selected:

1. Create PR to dispo-claude-config first
2. Create PR to dispo-clawdbot-config second
3. Link PRs in descriptions: `Related: <other-pr-url>`

### Phase 6: Cleanup

```bash
rm -rf $STAGING
```

---

## Routing Examples

| Item | Location/Signal | Target |
|------|-----------------|--------|
| gateway-cc | `~/.claude/services/` | clawdbot-config |
| github-cc | `~/.claude/services/` | clawdbot-config |
| slack-cc | `~/.claude/services/` | clawdbot-config |
| **reasoning** | Universal skill list | **BOTH** |
| **deep-research** | Universal skill list | **BOTH** |
| **commit** | Universal skill list | **BOTH** |
| **optimize-claude** | Universal skill list | **BOTH** |
| building-ui | `metadata.claude-code-only: true` | claude-config only |
| manage-polaris | `metadata.clawdbot: true` | clawdbot-config |
| pre-commit hook | `~/.claude/hooks/` | claude-config |

---

## Path Sanitization

Before PR, replace:
- `/Users/andyrong/` → `~/`
- `/Users/<any>/` → `~/`
- Absolute project paths → relative paths

---

## Error Handling

| Error | Action |
|-------|--------|
| Quality gate fails | Show failures, offer to auto-fix paths |
| Repo not accessible | Check permissions, suggest fork |
| Branch exists | Increment: `contrib/{name}-2` |
| PR creation fails | Show manual instructions |

---

## Post-PR Flow

After PR is merged:
1. Maintainer updates `manifest.yaml` with version/roles
2. Team runs `/optimize-claude sync`
3. Sync filters by role/machine from manifest
4. Contribution available to matching team members

---

## Example Session

```
User: /contribute

Claude: Scanning ~/.claude for changes...

Found modified items:
- skills/my-testing-skill/ (new)

What are you contributing?
User: Skill

Which skill?
User: my-testing-skill

Why share this?
User: Standardizes our unit testing workflow

Which roles?
User: Backend developers

Dependencies?
User: No dependencies

Scout detected: Claude Code (no clawdbot metadata)
Confirm target: dispo-claude-config
User: Yes

Running quality gate...

✓ All checks passed

Creating PR...

PR created: https://github.com/Dispo-Genius/dispo-claude-config/pull/15

Team members will get this after running /optimize-claude sync
(filtered by role: backend)
```

---

## Workflow: Sync (`/contribute sync`)

Detect all local items not yet in team repos and create PRs for them.

### Phase 1: Inventory Local Items

Create tasks for tracking:

```
TaskCreate: "Sync local items to team repos"
TaskCreate: "Inventory local skills"
TaskCreate: "Inventory local services"
TaskCreate: "Create PRs for missing items"
```

```bash
# List all local skills
ls ~/.claude/skills/

# List all local services
ls ~/.claude/services/
```

### Phase 2: Check What's in Repos

Clone both repos to temp and compare:

```bash
STAGING="/tmp/contribute-sync-$(date +%s)"
mkdir -p $STAGING

# Clone both repos
gh repo clone Dispo-Genius/dispo-claude-config $STAGING/claude-config
gh repo clone Dispo-Genius/dispo-clawdbot-config $STAGING/clawdbot-config
```

### Phase 3: Diff Report

Generate report of what's missing:

```
Sync Analysis:
==============

LOCAL SKILLS (27 total):
├── In claude-config: 15
├── In clawdbot-config: 8
├── In BOTH: 6
└── MISSING from repos: 12

Missing Items:
--------------
UNIVERSAL (should be in BOTH):
  ✗ deep-research      - not in clawdbot-config
  ✗ optimize-claude    - not in clawdbot-config
  ✗ reasoning          - not in clawdbot-config
  ✗ use-llms           - not in clawdbot-config
  ✗ checkpoint         - not in clawdbot-config
  ✗ commit             - not in clawdbot-config

CLAWDBOT-ONLY (services):
  ✓ All services synced

CLAUDE-CODE-ONLY:
  ✗ building-ui        - not in claude-config
  ✗ realtor-scraping   - not in claude-config

Contribute these items?
- Yes, create PRs for all missing (Recommended)
- Select which to contribute
- Skip
```

### Phase 4: Bulk PR Creation

For each missing item, apply routing rules and create PRs:

```
TaskUpdate: "Create PRs for missing items" → in_progress

Creating PRs...

[1/6] deep-research → clawdbot-config
  ✓ PR #2: https://github.com/Dispo-Genius/dispo-clawdbot-config/pull/2

[2/6] optimize-claude → clawdbot-config
  ✓ PR #3: https://github.com/Dispo-Genius/dispo-clawdbot-config/pull/3

[3/6] reasoning → clawdbot-config
  ✓ PR #4: https://github.com/Dispo-Genius/dispo-clawdbot-config/pull/4

...

TaskUpdate: "Create PRs for missing items" → completed

Summary:
- 6 PRs created to dispo-clawdbot-config
- 2 PRs created to dispo-claude-config
- Review and merge to complete sync
```

### Phase 5: Cleanup

```bash
rm -rf $STAGING
```

---

## Example: Sync Session

```
User: /contribute sync

Claude: Scanning local items and comparing to team repos...

TaskCreate: "Sync local items to team repos"

Cloning repos for comparison...

Sync Analysis:
==============

LOCAL SKILLS (27 total):
└── MISSING from clawdbot-config: 6

Missing Universal Skills (should be in BOTH repos):
  ✗ deep-research
  ✗ optimize-claude
  ✗ reasoning
  ✗ use-llms
  ✗ checkpoint
  ✗ commit

These skills are useful to both Claude Code AND Polaris.
Currently they only exist in claude-config.

Contribute to clawdbot-config?
User: Yes

Running quality gate on 6 items...
✓ All items passed

Creating PRs...
✓ PR #2: deep-research
✓ PR #3: optimize-claude
✓ PR #4: reasoning
✓ PR #5: use-llms
✓ PR #6: checkpoint
✓ PR #7: commit

TaskUpdate: completed

Done! 6 PRs created. After merge, Polaris will have access to these skills.
```
