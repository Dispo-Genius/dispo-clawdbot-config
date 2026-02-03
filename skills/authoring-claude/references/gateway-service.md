# Gateway Service Patterns

Complete guide for creating services that integrate with `gateway-cc`.

## Directory Structure

```
~/.claude/services/<name>-cc/
├── gateway.json          # Service registration
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── TOOL.md               # Command documentation
└── src/
    ├── index.ts          # CLI entry (Commander)
    ├── types.ts          # TypeScript types
    ├── api/
    │   └── client.ts     # API client wrapper
    ├── commands/
    │   ├── list.ts       # Read-only commands
    │   ├── get.ts
    │   └── create.ts     # Write commands
    └── utils/
        └── output.ts     # TOON output helpers
```

## gateway.json Schema

```json
{
  "enabled": true,
  "authVars": ["SERVICE_API_KEY"],
  "rateLimit": {
    "type": "rpm",
    "limit": 50
  },
  "approval": {
    "auto": ["list", "get", "view"],
    "requires": ["create", "update", "delete"]
  },
  "execution": {
    "type": "local"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Service enabled/disabled |
| `authVars` | string[] | Required credentials (injected from keychain at runtime) |
| `rateLimit.type` | `"rpm"` \| `"concurrency"` \| `"none"` | Rate limit strategy |
| `rateLimit.limit` | number | Max requests/minute or concurrent |
| `approval.auto` | string[] | Commands that run without confirmation |
| `approval.requires` | string[] | Commands needing user confirmation |
| `execution.type` | `"local"` \| `"remote"` | Where commands execute |
| `execution.host` | string | (remote only) Gateway server hostname |
| `execution.port` | number | (remote only) Gateway server port (default: 4100) |

### Rate Limit Types

- **rpm** - Requests per minute (sliding window)
- **concurrency** - Max simultaneous requests
- **none** - No rate limiting

### Approval Modes

Commands in `approval.auto` run immediately. Commands in `approval.requires` emit an INFO message; actual enforcement is at Claude Code layer.

Commands not listed in either array default to auto-approved.

## Credential Management

### Security Model

**Credentials are stored in macOS Keychain only.** AI models cannot read credential values.

| AI Can | AI Cannot |
|--------|-----------|
| List key names | Read key values |
| Set new keys | Export credentials |
| Delete keys | Access keychain directly |
| Check if key exists | Bypass via `security -w` |

Pre-tool hooks block attempts to read keychain values directly (`security find-generic-password -w`).

### Remote vs Local Execution

**CRITICAL SECURITY RULE:** For remote services, credentials must ONLY exist on the gateway server.

| Execution Type | Where Credentials Live | Local Machine Has |
|----------------|----------------------|-------------------|
| `local` | Local machine | API keys |
| `remote` | Gateway server (Mac Mini) | Nothing (just gateway token) |

### Quick Discovery (Recommended)

Check what credentials are available without SSHing:

```bash
# List all credential key names (no values) - works remotely
gateway-cc keys list
# → { "profile": "polaris", "keys": ["STRIPE_SECRET_KEY", "TAILSCALE_API_KEY", ...] }

# Check if specific key exists
gateway-cc keys exists TAILSCALE_API_KEY
# → exit 0 if exists, exit 1 if not
```

HTTP endpoints are also available:
- `GET /keys/list` - List credential names
- `GET /keys/exists/:name` - Check if credential exists
- `POST /keys/set` - Set a credential (auth required)
- `DELETE /keys/:name` - Delete a credential (auth required)

### Setting Credentials on Gateway Server (Mac Mini)

For services with `"execution": {"type": "remote"}`:

**SECURITY: Never paste API keys into Claude chat.** Keys in conversation history = compromised.

**Correct procedure:**

1. SSH to gateway server:
   ```bash
   ssh polaris@100.98.117.47
   # Or use Tailscale browser SSH: polariss-mac-mini-1
   ```

2. Check what's available:
   ```bash
   gateway-cc keys list
   ```

3. Set credential (prompts for value securely):
   ```bash
   gateway-cc keys set SERVICE_API_KEY
   # > Enter value: [hidden]
   # ✓ Set SERVICE_API_KEY for profile polaris
   ```

4. Verify it's set:
   ```bash
   gateway-cc keys exists SERVICE_API_KEY
   ```

5. No restart needed - credentials are loaded on-demand

**Why Claude shouldn't handle keys:**
- Chat history persists → key exposed in logs
- If key appears in chat, **rotate it immediately**
- Claude can test connectivity, but user sets the actual secret

**Never run `keys set` locally for remote services.** The whole point of remote execution is that secrets never leave the gateway server.

### Lookup Order (Internal)

The internal `_getKeyInternal()` function (not exposed to AI) checks:

1. **Profile keychain** - macOS Keychain with account `gateway:{profile}`
2. **Legacy keychain** - macOS Keychain with `clawdbot` account
3. **Environment variable** - `process.env[keyName]`

Default profile: `DEFAULT_CREDENTIAL_PROFILE` env var, or system username.

### Migration from JSON Files

If you have legacy JSON credential files, migrate them:

```bash
~/.claude/services/gateway-cc/scripts/migrate-to-keychain.sh --dry-run  # preview
~/.claude/services/gateway-cc/scripts/migrate-to-keychain.sh            # migrate
rm -rf ~/.clawdbot/credentials                                        # cleanup
```

### Note on Service Code

Services should NOT import credential functions directly. The gateway runner handles credential injection via environment variables at execution time. This ensures:

1. Credentials are never in AI context
2. Credentials are only available during actual execution
3. No way to leak credentials through code inspection

## Invocation

All services are invoked via `gateway-cc exec`:

```bash
# Via gateway-cc
npx tsx ~/.claude/services/gateway-cc/src/index.ts exec <service> <command> [args...]

# Examples
gateway-cc exec github status
gateway-cc exec linear list-issues --project "My Project"
gateway-cc exec slack send-dm --user U12345 --message "Hello"
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (general failure) |
| 2 | Confirmation required (fail-first pattern) |

### Fail-First Approval Pattern

For destructive operations, implement `--confirmed` flag:

```typescript
export const deleteCommand = new Command('delete')
  .argument('<id>', 'Item ID to delete')
  .option('--confirmed', 'Confirm deletion')
  .action((id, opts) => {
    if (!opts.confirmed) {
      console.log(JSON.stringify({
        confirmation_required: true,
        action: 'delete',
        target: id,
        message: `Delete item ${id}? Re-run with --confirmed to proceed.`
      }));
      process.exit(2);
    }

    // Perform deletion
    performDelete(id);
  });
```

Claude Code interprets exit code 2 as needing user confirmation before retrying with `--confirmed`.

## Error Output Format

```json
{"error": "message", "code": "ERROR_CODE"}
```

Common error codes:
- `AUTH_MISSING` - Credential not configured
- `AUTH_INVALID` - Credential rejected by API
- `RATE_LIMITED` - API rate limit exceeded
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input

## Testing Checklist

1. **Read-only first** - Test `list`, `get`, `view` commands before write operations
2. **Verify JSON output** - Ensure output is valid JSON in `--format json` mode
3. **Test error handling** - Invalid input, missing auth, API errors
4. **Test via gateway** - `gateway-cc exec <service> <command>`
5. **Check rate limits** - `gateway-cc status` shows rate limit state

```bash
# Test commands
gateway-cc exec myservice list
gateway-cc exec myservice get 123
gateway-cc exec myservice create --dry-run
```

## TOOL.md Structure

Every service should have a `TOOL.md`:

```markdown
# <service>-cc

Brief description of what this service does.

## Commands

### list
List all items.

```bash
gateway-cc exec myservice list [--limit N]
```

### get
Get item by ID.

```bash
gateway-cc exec myservice get <id>
```

## Configuration

Required credentials:
- `SERVICE_API_KEY` - API key from service dashboard

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_MISSING | API key not configured |
| NOT_FOUND | Item not found |
```

## Example: Minimal Service

```typescript
// src/index.ts
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('myservice-cc')
  .version('1.0.0');

program
  .command('status')
  .description('Check service status')
  .action(() => {
    // Credentials are injected as env vars by gateway runner
    // Listed in gateway.json authVars
    const apiKey = process.env.MYSERVICE_API_KEY;
    if (!apiKey) {
      console.log(JSON.stringify({ error: 'API key not configured', code: 'AUTH_MISSING' }));
      process.exit(1);
    }
    console.log(JSON.stringify({ status: 'ok', authenticated: true }));
  });

program.parse();
```

```json
// gateway.json
{
  "enabled": true,
  "authVars": ["MYSERVICE_API_KEY"],
  "rateLimit": { "type": "rpm", "limit": 60 },
  "approval": { "auto": ["status", "list"], "requires": [] },
  "execution": { "type": "local" }
}
```

The gateway runner reads `MYSERVICE_API_KEY` from keychain and injects it into `process.env` before spawning the service. Services never directly access keychain.
