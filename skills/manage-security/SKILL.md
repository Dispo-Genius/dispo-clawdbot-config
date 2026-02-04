---
name: manage-security
description: Secret scanning via ggshield. Pre-commit hooks, cron scans, gateway-coordinated reporting.
metadata: {"clawdbot":{"emoji":"🔐"}}
---

# Security Scanning

Gateway-coordinated secret scanning with pre-commit hooks, scheduled scans, and centralized reporting.

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security <command> [options]
```

---

## Commands

### scan
Scan current directory or specified path for secrets.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security scan [path]

# Options
--all           Scan all registered repos
--report        Report results to gateway (default: true)
--no-report     Skip gateway reporting

# Examples
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security scan
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security scan ~/code/myproject
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security scan --all
```

### history-scan
Deep scan git history for secrets (uses TruffleHog).
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security history-scan [path]

# Options
--only-verified    Only show verified secrets
--no-report        Skip gateway reporting

# Example
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security history-scan ~/code/myproject
```

### install
Install pre-commit hooks in a repository.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security install [path]

# Examples
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security install
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security install ~/code/myproject
```

### cron
Manage scheduled weekly security scans.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security cron <action>

# Actions
enable     Enable weekly cron scan
disable    Disable weekly cron scan
run        Run cron scan now (manual trigger)

# Examples
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security cron enable
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security cron disable
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security cron run
```

### status
Show security posture: installed hooks, scan history, registered repos.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security status

# Options
--history <n>    Show last n scans (default: 5)
```

### config
Manage security configuration.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security config <action> [options]

# Actions
get                      Get current config
add-repo <path>          Register a repo for cron scanning
remove-repo <path>       Unregister a repo
set-slack <on|off>       Enable/disable Slack notifications

# Examples
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security config get
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security config add-repo ~/code/myproject
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec security config set-slack on
```

---

## Prerequisites

Install scanning tools:
```bash
# ggshield (GitGuardian CLI) - main scanner
brew install gitguardian/tap/ggshield

# TruffleHog - git history scanning (optional)
brew install trufflehog
```

---

## Response Format

**Scan Success (no secrets):**
```json
{"success": true, "secretsFound": 0, "path": "/path/to/repo", "scanType": "manual"}
```

**Scan Found Secrets:**
```json
{"success": true, "secretsFound": 3, "path": "/path/to/repo", "details": [...], "alertSent": true}
```

**Error:**
```json
{"success": false, "error": "ggshield not installed. Run: brew install gitguardian/tap/ggshield"}
```

---

## How It Works

1. **Pre-commit hooks** - Installed via `install` command, blocks commits containing secrets
2. **Manual scans** - Run `scan` command, results reported to gateway
3. **Cron scans** - Weekly scan of registered repos, Slack alert if secrets found
4. **Gateway coordination** - Centralized scan history, config sync across machines

---

## Slack Alerts

When secrets are found, the skill can send Slack alerts via `/manage-slack`:
- Alert sent to DM by default
- Includes repo path, scan type, and secret count
- Disable with `config set-slack off`
