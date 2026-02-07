---
name: account-selector
description: Local account selection using macOS keychain OAuth credentials
version: 1.0.0
---

# Account Selector

Select optimal Claude account based on real-time usage data from Anthropic API.

## Features

- **Local keychain** - Reads OAuth tokens from macOS keychain (no 1Password dependency)
- **Auto-refresh** - Automatically refreshes expired OAuth tokens
- **Usage-based selection** - Picks account with highest urgency (remaining quota / time to reset)
- **Multi-account** - Supports account1, account2, account3

## Usage

```bash
# Select optimal account (returns JSON)
cd ~/.claude/skills/account-selector/tool
npx tsx src/index.ts select

# Show status of all accounts
npx tsx src/index.ts status
```

## Output Format

```json
{
  "account": "account1",
  "email": "user@example.com",
  "fiveHour": { "utilization": 25, "resetsAt": "2024-..." },
  "sevenDay": { "utilization": 10, "resetsAt": "2024-..." },
  "credential": "{...}"
}
```

## Integration

Used by `_cc_select_account()` in `~/.claude/scripts/cc.sh` to auto-select accounts.

## Keychain Format

Credentials stored in macOS keychain:
- Service: `Claude Code-credentials-{hash}`
- Hash: First 8 chars of SHA256 of config dir path
- Value: JSON with `claudeAiOauth.accessToken`, `refreshToken`, etc.
