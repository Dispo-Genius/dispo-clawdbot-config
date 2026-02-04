# `/manage-security` - Gateway-Coordinated Secret Scanning Skill

**Status:** draft
**Slug:** manage-security

## Problem

API keys/tokens getting exposed in logs. Need:
1. Detect secrets before they hit git (pre-commit hooks)
2. Scheduled security scans (cron)
3. Centralized scan history and alerts (gateway)

## Goal

Build a skill with gateway-coordinated secret scanning that prevents credential leaks through pre-commit hooks, scheduled scans, and centralized reporting.

## Solution

Two components:

**Gateway (Mac Mini):**
- SQLite tables: `security_scans`, `security_config`
- Routes: POST /security/report, GET /security/config/:clientId, PUT /security/config/:clientId, GET /security/history/:clientId
- Slack notification when secrets found

**Local Skill (Laptop):**
- Wraps ggshield CLI for scanning
- Reports results to gateway
- Installs pre-commit hooks
- Manages cron jobs

## Commands

```
/security-scan              # Scan current repo
/security-scan --all        # Scan all registered repos
/security-scan --history    # Deep scan git history (TruffleHog)
/security-scan --install    # Install pre-commit hooks
/security-scan --cron       # Setup weekly cron job
/security-scan --status     # Show security posture
```

## Tasks

### Gateway (Mac Mini)

- [ ] Add security_scans, security_config tables to `~/.claude/skills/manage-gateway/service/src/db/schema.ts`
- [ ] Add /security/* endpoints to `~/.claude/skills/manage-gateway/service/src/server/routes.ts`

### Local Skill

- [ ] Create `~/.claude/skills/manage-security/SKILL.md`
- [ ] Create `~/.claude/skills/manage-security/service/src/index.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/commands/scan.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/commands/install.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/commands/cron.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/commands/status.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/utils/ggshield.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/utils/gateway.ts`
- [ ] Create `~/.claude/skills/manage-security/service/src/utils/output.ts`
- [ ] Create `~/.claude/skills/manage-security/templates/pre-commit`

## Database Schema

```sql
CREATE TABLE security_scans (
  id INTEGER PRIMARY KEY,
  client_id TEXT,
  repo_path TEXT,
  secrets_found INTEGER,
  scan_type TEXT,  -- 'manual' | 'cron' | 'pre-commit'
  details TEXT,    -- JSON of findings
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_config (
  client_id TEXT PRIMARY KEY,
  repos TEXT,           -- JSON array of repo paths
  cron_enabled INTEGER,
  slack_notify INTEGER
);
```

## Acceptance Criteria

1. `/security-scan` detects test secret in scratchpad file
2. `/security-scan --install` adds `.pre-commit-config.yaml` to repo
3. Committing file with `AKIA...` pattern - pre-commit hook blocks
4. `/security-scan --status` shows all registered repos and hook status
5. Gateway receives scan reports and stores in SQLite
6. Slack notification fires when secrets_found > 0

## Dependencies

- ggshield CLI (`brew install gitguardian/tap/ggshield`)
- TruffleHog for history scanning (`brew install trufflehog`)
- Gateway server running on Mac Mini
