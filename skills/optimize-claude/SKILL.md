---
name: optimize-claude
description: Sync config updates, bootstrap fresh installs, browse marketplace. Triggers on "optimize claude", "sync config", "bootstrap claude", "claude marketplace".
---

# Optimize Claude

Sync your `~/.claude` config with the team repo, bootstrap fresh installs, and browse available skills/tools.

## Commands

| Command | Description |
|---------|-------------|
| `/optimize-claude` | Status check - show updates available |
| `/optimize-claude sync` | Pull updates, preserve customizations |
| `/optimize-claude bootstrap` | Fresh install setup |
| `/optimize-claude browse` | View all available items |
| `/optimize-claude install <name>` | Install specific item |

---

## Key Files

| File | Purpose |
|------|---------|
| `~/.claude/manifest.yaml` | Catalog of all items (from repo) |
| `~/.claude/user.yaml` | Personal config (never synced) - includes `machine:` field |
| `~/.claude/.installed` | Tracks installed versions |
| `~/.claude/local/` | Deprecated/custom items |

---

## Machine Affinity

Each machine identifies itself via `machine:` field in user.yaml. Manifest items can specify which machines they belong to.

### user.yaml Machine Field

```yaml
# Auto-detected from hostname on first run:
# - Contains "polaris" -> polaris
# - Otherwise -> andy
machine: andy  # or polaris
```

### Manifest Machine Field

```yaml
skills:
  - name: agent-browser
    machines: [andy]      # Laptop only (needs GUI)
  - name: github-cc
    # no machines field   # Both (backward compatible)
  - name: commit
    machines: [all]       # Explicit both
```

### Filtering Rules

1. No `machines:` field → install everywhere (backward compatible)
2. `machines: [all]` → install everywhere
3. Machine in list → install
4. Machine not in list → skip with advisory warning

---

## Workflow: Status (Default)

**When:** User runs `/optimize-claude` with no args

1. Load files:
   ```bash
   cat ~/.claude/manifest.yaml
   cat ~/.claude/user.yaml
   cat ~/.claude/.installed
   ```

2. Compare installed vs manifest versions

3. Report:
   - Updates available (version mismatches)
   - Deprecation notices
   - New items matching user's roles
   - Overall health score

**Output format:**
```
Config Status: Healthy

Updates Available:
- building-ui: 1.1.0 → 1.2.0
- commit: 1.0.0 → 1.1.0

Deprecations:
- authoring-skills → use authoring-claude

New Items for Your Roles [frontend, backend]:
- new-skill-name (frontend)

Run `/optimize-claude sync` to apply updates.
```

---

## Workflow: Sync

**When:** User runs `/optimize-claude sync`

### Phase 1: Load Product & Machine Identity

```bash
cat ~/.claude/user.yaml | grep -E "^product:|^machine:"
```

Extract:
- `product`: `claude-code` or `openclaw` (determines which repo to sync from)
- `machine`: `andy` or `polaris` (determines which items to install)

If product missing, default to `claude-code`.

### Phase 2: Fetch Remote

Based on product:
```bash
# claude-code
cd ~/.claude && git fetch origin main

# openclaw
cd ~/dispo-clawdbot-config && git fetch origin main
```

### Phase 3: Detect Customizations

Check each file for local changes:
- Files with `customized: true` in YAML frontmatter
- Files in `.installed` with `customizations` array

### Phase 4: Preview Diff

**ALWAYS show diff before applying** (unless `preview_diff: false` in user.yaml):

```
Changes to apply:

UPDATED:
  skills/building-ui/SKILL.md
    - Added new token reference
    - Updated example code

PRESERVED (local customizations):
  skills/commit/SKILL.md
    - Your customization will be kept
    - Upstream has changes (review manually)

DEPRECATED (moving to local/):
  skills/authoring-skills/
    - Replacement: authoring-claude

SKIPPED (wrong machine):
  skills/agent-browser/      [machines: andy, current: polaris]

Apply these changes?
- Yes, apply (Recommended)
- Show full diff first
- Skip
```

### Phase 4: Apply Changes

Based on user choice:

**No local changes:** Replace with remote
```bash
git checkout origin/main -- skills/<name>/
```

**Has customizations:** Preserve, notify
- Keep local file
- Save upstream version to `<file>.upstream` for reference
- Add to `.installed` customizations list

**Deprecations:** Move to local/
```bash
mkdir -p ~/.claude/local/deprecated
mv ~/.claude/skills/authoring-skills ~/.claude/local/deprecated/
```

### Phase 5: Update CLAUDE.md Roles

If user has role-specific sections in CLAUDE.md:

```markdown
<!-- ROLE: frontend -->
## Frontend Guidelines
...
<!-- END: frontend -->
```

Merge sections based on user's roles from `user.yaml`.

### Phase 6: Update Tracking

Update `.installed`:
- `last_sync` timestamp
- New versions
- Customization flags

---

## Workflow: Bootstrap

**When:** Fresh install or user runs `/optimize-claude bootstrap`

### Phase 1: Backup Existing
```bash
if [ -d ~/.claude ]; then
  mv ~/.claude ~/.claude.backup.$(date +%Y%m%d)
fi
```

### Phase 2: Product Selection

Use AskUserQuestion:

```
Welcome! Which product are you setting up?

○ Claude Code (Recommended)
  Developer CLI with skills for coding workflows
  Repo: Dispo-Genius/dispo-claude-config

○ OpenClaw
  AI assistant platform with integrations
  Repo: Dispo-Genius/dispo-clawdbot-config
```

### Phase 3: Clone Repo

Based on product selection:
```bash
# Claude Code
git clone https://github.com/Dispo-Genius/dispo-claude-config ~/.claude

# OpenClaw
git clone https://github.com/Dispo-Genius/dispo-clawdbot-config ~/dispo-clawdbot-config
cd ~/dispo-clawdbot-config && ./scripts/setup.sh
```

### Phase 4: Interview

Use AskUserQuestion:

```
What is your name?
[text input]

What is your email?
[text input]

What roles describe you? (select all that apply)
- Frontend Developer
- Backend Developer
- Designer
- ML Engineer
- Data Analyst
- QA Engineer
```

### Phase 5: Create user.yaml

Based on interview + auto-detection:
```yaml
user:
  name: "<name>"
  email: "<email>"

# Product selected during bootstrap
# - claude-code: Developer CLI (dispo-claude-config)
# - openclaw: AI assistant (dispo-clawdbot-config)
product: <selected_product>

# Auto-detected from hostname:
# - Contains "polaris" -> polaris
# - Otherwise -> andy
machine: <auto-detected>

roles: [<selected_roles>]

email:
  signature: "- <first_name>"
  style: "casual"

preferences:
  preview_diff: true
  auto_update: false
```

### Phase 6: Install Machine & Role-Specific Items

Filter manifest by machine AND roles:
- Machine filter: Install if no `machines:` field, `machines: [all]`, or current machine in list
- Role filter: Install if `roles: [all]` or matches user role
- Skip items that don't match BOTH filters

### Phase 7: Generate CLAUDE.md

Merge role sections from `~/.claude/templates/`:
- Core section (always included)
- Role-specific sections

---

## Workflow: Browse

**When:** User runs `/optimize-claude browse`

Display all items from manifest, filtered by current machine:

```
Available Skills (machine: andy):

INSTALLED:
  building-ui (1.2.0) - Design system components [frontend, designer] [andy]
  commit (1.0.0) - Commit workflow [all] [all]
  ...

AVAILABLE (not installed):
  new-ml-skill (1.0.0) - ML pipeline helpers [ml] [all]
    → Run `/optimize-claude install new-ml-skill` to add

DEPRECATED:
  authoring-skills → authoring-claude

OTHER MACHINE (polaris only):
  agentmail-cc - Email triggers [polaris]
```

---

## Workflow: Install

**When:** User runs `/optimize-claude install <name>`

1. Check manifest for item
2. Check if already installed
3. Download/copy files
4. Update `.installed`
5. If skill, update skill-rules.json

---

## Error Handling

| Error | Action |
|-------|--------|
| No git repo | Offer bootstrap |
| Merge conflict | Show conflict, ask user |
| Missing manifest | Fetch from remote |
| Permission denied | Check file permissions |

---

## References

For audit-specific checks, see:
- [claude-md-rules.md](references/claude-md-rules.md)
- [skill-rules.md](references/skill-rules.md)
- [agent-rules.md](references/agent-rules.md)
- [config-rules.md](references/config-rules.md)
