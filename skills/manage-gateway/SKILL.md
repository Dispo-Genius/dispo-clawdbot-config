---
name: manage-gateway
description: Gateway service for Claude Code tools. Provides kill switch, rate limiting, usage logging, and service orchestration.
metadata: {"clawdbot":{"emoji":"🚪"}}
---

# Gateway Service

Unified interface to all `-cc` services with kill switch, rate limiting, and usage logging.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  MacBook (or any client)                                     │
│  └── Gateway CLI (~/.claude/skills/manage-gateway/service/)  │
│      • Middleware: kill switch, rate limiting, approval      │
│      • Routes to LOCAL or REMOTE based on execution.type     │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │ LOCAL                                     │ REMOTE
        │ (execution.type: "local")                 │ (default when GATEWAY_REMOTE_HOST set)
        ▼                                           ▼
┌─────────────────────┐               ┌─────────────────────────────────┐
│ Local service impl  │               │ Mac Mini (polariss-mac-mini-1)  │
│ ~/.claude/skills/   │               │ Gateway HTTP Server (:4100)     │
│ manage-*/service/   │               │ ~/gateway/src/services/         │
│                     │               │                                 │
│ • github (git ops)  │               │ • linear (17 commands)          │
│ • voiceink          │               │ • slack (19 commands)           │
│ • agentmail         │               │ • gmail (7 commands)            │
└─────────────────────┘               │ • vercel (12 commands)          │
                                      │ • fathom (7 commands)           │
                                      │ • polaris (20 commands)         │
                                      │ • stripe (22 commands)          │
                                      │ • analyze-media (2 commands)    │
                                      └─────────────────────────────────┘
```

### Execution Routing

1. **Local services** (`execution.type: "local"` in gateway.json):
   - Run on client machine via `npx tsx`
   - Used for services needing local filesystem (git, voiceink)

2. **Remote services** (default when `GATEWAY_REMOTE_HOST` is set):
   - HTTP POST to Mac Mini gateway server
   - Auth via 1Password service account token
   - Credentials fetched from 1Password Shared vault on Mac Mini

### Environment Variables

```bash
# In ~/claude-config/.env (or project .env)
GATEWAY_REMOTE_HOST=polariss-mac-mini-1    # Mac Mini hostname
OP_SERVICE_ACCOUNT_TOKEN=ops_...           # Used for gateway auth (auto-fallback)

# Optional overrides
GATEWAY_REMOTE_PORT=4100                   # Default: 4100
GATEWAY_REMOTE_TOKEN=<token>               # Override OP token if needed
```

### Polaris (Mac Mini's Claude)

Polaris also uses the gateway CLI with `GATEWAY_REMOTE_HOST=localhost`, routing through the same HTTP gateway for consistent rate limiting and logging.

## Quick Reference

```bash
# Gateway CLI (alias: GW)
GW="npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts"

$GW services                          # List all services
$GW exec <service> <command> [args]   # Execute service command
$GW status <service>                  # Check service status
$GW keys list                         # List credential keys
$GW keys set <KEY_NAME>               # Set credential (prompts securely)
$GW keys exists <KEY_NAME>            # Check if key exists
$GW usage [--service <name>] [--since 24h]  # Usage analytics
$GW kill <service> --reason "reason"  # Emergency kill switch
$GW unkill <service>                  # Restore service
$GW killswitch                        # Show all kill switches
```

## Service Discovery

Gateway discovers services from two locations (priority order):

1. **Skills folder (preferred):** `~/.claude/skills/*/service/gateway.json`
   - Service name: `manage-linear` → `linear`
2. **Legacy services folder:** `~/.claude/services/*-cc/gateway.json`
   - Service name: `linear-cc` → `linear`

Skills folder takes precedence if both exist.

## Creating a New Service

### Decision: Local vs Remote

| Choose LOCAL when | Choose REMOTE when |
|-------------------|-------------------|
| Service needs local filesystem (git, file ops) | Service is API-only (Linear, Slack, Stripe) |
| Must run on client machine | Can run anywhere with credentials |
| Low latency critical | Centralized credentials preferred |

### Local Service (runs on client)

**Location:** `~/.claude/skills/manage-<name>/service/`

```
~/.claude/skills/manage-<name>/
├── SKILL.md           # Skill documentation (triggers, examples)
└── service/
    ├── gateway.json   # Gateway registration
    ├── package.json   # Dependencies
    ├── tsconfig.json  # TypeScript config
    └── src/
        └── index.ts   # CLI implementation (Commander.js)
```

**gateway.json for local:**
```json
{
  "enabled": true,
  "authVars": ["MY_API_KEY"],
  "rateLimit": { "type": "rpm", "limit": 60 },
  "approval": {
    "auto": ["list", "read", "status"],
    "requires": ["create", "delete"]
  },
  "execution": { "type": "local" }
}
```

### Remote Service (runs on Mac Mini)

**Location:** `polaris:~/gateway/src/services/<name>/`

```bash
# SSH to Mac Mini and create service
ssh polaris
cd ~/gateway/src/services
mkdir -p <name>/commands

# Create service files
# - index.ts (service entry point)
# - gateway.json (same format as local)
# - commands/*.ts (command implementations)

# Update registry
# Edit ~/gateway/src/services/index.ts to add service

# Install deps if needed
cd ~/gateway && npm install <package>

# Commit
cd ~/gateway && git add . && git commit -m "feat: add <name> service"
```

**gateway.json for remote (no execution.type needed):**
```json
{
  "enabled": true,
  "authVars": ["MY_API_KEY"],
  "rateLimit": { "type": "rpm", "limit": 60 },
  "approval": {
    "auto": ["list", "read"],
    "requires": ["create", "delete"]
  }
}
```

Services without explicit `execution.type` default to remote when `GATEWAY_REMOTE_HOST` is set.

### 3. CLI Implementation Pattern

```typescript
// src/index.ts
import { program } from 'commander';

program
  .name('myservice')
  .description('My service description');

program
  .command('status')
  .description('Get status')
  .action(async () => {
    // Output TOON format (token-efficient)
    console.log('ok|ready');
  });

program.parse();
```

### 4. SKILL.md Template

```markdown
---
name: manage-<name>
description: <Service> integration via CLI. Triggers on "<keywords>".
---

# Manage <Name>

## Commands

\`\`\`bash
$GW exec <name> status         # Check status
$GW exec <name> list           # List items
$GW exec <name> get <id>       # Get item details
\`\`\`
```

### 5. Register and Test

```bash
# Install dependencies
cd ~/.claude/skills/manage-<name>/service && npm install

# Verify discovery
$GW services | grep <name>

# Test commands
$GW exec <name> status
```

## Mac Mini Gateway Server

The gateway HTTP server runs on Mac Mini, managed by launchd.

### Server Management

```bash
# Check health
curl http://polariss-mac-mini-1:4100/health

# View server logs
ssh polaris "tail -100 ~/gateway/logs/server.log"

# Restart server (if needed)
ssh polaris "launchctl kickstart -k gui/501/com.dispo.gateway"
```

### Server Code Location

```
polaris:~/gateway/
├── src/
│   ├── index.ts              # CLI + server entry
│   ├── server/               # HTTP server implementation
│   │   ├── index.ts          # Express server
│   │   └── auth.ts           # 1Password token validation
│   └── services/             # Service implementations
│       ├── index.ts          # Service registry
│       ├── linear/
│       ├── slack/
│       └── ...
├── package.json
└── .env                      # Server credentials
```

### Adding Service to Mac Mini

1. SSH to Mac Mini: `ssh polaris`
2. Create service in `~/gateway/src/services/<name>/`
3. Add to registry in `~/gateway/src/services/index.ts`
4. Commit: `cd ~/gateway && git add . && git commit -m "feat: add <name>"`

## Credential Management

Gateway credentials are stored in macOS Keychain:

```bash
$GW keys list                         # List all stored keys
$GW keys set GITHUB_TOKEN             # Set key (prompts securely)
$GW keys exists ANTHROPIC_API_KEY     # Check if key exists
```

**For remote services:** SSH to the remote host and run the same commands there.

## Error Handling

When gateway calls fail:

| Error | Meaning | Action |
|-------|---------|--------|
| `SERVICE_NOT_FOUND` | Service not discovered | Check `gateway.json` exists |
| `SERVICE_DISABLED` | Kill switch active | Run `$GW unkill <service>` |
| `AUTH_MISSING` | Credentials missing | Run `$GW keys set <KEY>` |
| `RATE_LIMITED` | Too many requests | Wait or increase limit |
| `REMOTE_UNREACHABLE` | Remote host offline | Check network/VPN |

## Rate Limiting

Three types:
- **rpm**: Requests per minute (e.g., 60/min)
- **concurrency**: Max parallel requests (e.g., 1 concurrent)
- **none**: No limiting

## Claude Code Launch

Gateway provides account-aware Claude Code launching with automatic credential injection.

### Commands

```bash
$GW launch                    # Launch with optimal account (lowest 5h usage)
$GW launch --account account2 # Force specific account
$GW launch --dry-run          # Show what would happen without launching
```

### Flow

1. Client queries gateway `/account-selector/select-live`
2. Gateway fetches live usage from Anthropic API via 1Password
3. Gateway selects optimal account (lowest 5-hour utilization)
4. Gateway returns OAuth credentials
5. Client injects credentials to local macOS keychain
6. Client execs `claude --dangerously-skip-permissions`

### Shell Aliases

Add to `~/.zshrc`:

```bash
# Gateway launcher
alias gateway-cc="npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts"

# Quick account launchers (require cc.sh wrapper for worktree support)
alias cc="~/.claude/scripts/cc.sh"
alias cc1="cc --account account1"
alias cc2="cc --account account2"
alias cc3="cc --account account3"
```

### New Machine Setup

**Required:** `OP_SERVICE_ACCOUNT_TOKEN` for 1Password access and gateway authentication.

```bash
# Option 1: Environment variable (recommended)
echo 'export OP_SERVICE_ACCOUNT_TOKEN="ops_..."' >> ~/.claude/.env

# Option 2: macOS Keychain
security add-generic-password -s "claude-gateway" -a "$(whoami)" -w "ops_..."
```

The token must have access to the `andyrong` 1Password vault containing:
- `CC-OAuth-account1` - OAuth credentials for account1
- `CC-OAuth-account2` - OAuth credentials for account2
- `CC-OAuth-account3` - OAuth credentials for account3
- `Anthropic-API-*` - API keys for usage checking

### Gateway Server

The gateway server runs on Mac Mini, managed by launchd (auto-restart, starts on login).

```bash
# Check health
curl http://polariss-mac-mini-1.tail3351a2.ts.net:4100/health

# Override gateway URL (for local testing)
export GATEWAY_URL="http://localhost:4100"
$GW launch --dry-run
```

**Ops:** See `/Users/andyrong/gateway/README.md` for deployment and launchd details.

## Contributing Services

After creating a new service:

1. Test locally: `$GW exec <name> status`
2. Run `/contribute` to push to team config
3. Document in SKILL.md with trigger keywords
