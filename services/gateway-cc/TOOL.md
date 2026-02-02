# gateway-cc

CLI reference for `gateway-cc`. Auto-generated from Commander.js definitions.

## Client Authentication

gateway-cc uses **client keys** to authenticate Claude Code instances. These are distinct from Clawdbot's API tokens.

| Env Variable | Purpose |
|--------------|---------|
| `CC_CLIENT_KEY_POLARIS` | Authenticates Polaris (Mac Mini) as a client |
| `CC_CLIENT_KEY_LAPTOP` | Authenticates laptop as a client |
| `CC_CLIENT_<NAME>` | Dynamic client registration |
| `CC_CLIENT_<NAME>_RPM` | Rate limit for dynamic client (default: 60) |

Legacy names (`GATEWAY_TOKEN_*`, `GATEWAY_CLIENT_*`) still work for backwards compatibility.

**Not to be confused with:** Clawdbot's `gateway.auth.token` in `~/.clawdbot/clawdbot.json`, which authenticates HTTP requests TO Polaris.

## HTTP API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/services` | GET | List available services |
| `/exec` | POST | Execute service command |
| `/webhook/agentmail` | POST | Receive AgentMail webhooks |
| `/webhook/agentmail/events` | GET | Query stored webhook events |
| `/anthropic/*` | POST | Proxy to Anthropic API |

### Anthropic Proxy

The `/anthropic/*` endpoint proxies requests to `api.anthropic.com`. This allows clients to use Anthropic's API without needing the API key directly.

**Usage:**
```bash
curl -X POST http://gateway:4100/anthropic/v1/messages \
  -H "Authorization: Bearer $CC_CLIENT_KEY_LAPTOP" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-haiku-4-5-20251101", "max_tokens": 1024, "messages": [...]}'
```

**Requirements:**
- Gateway must have `ANTHROPIC_API_KEY` environment variable set
- Client authenticated via Bearer token
- Rate limited per client (uses `anthropic:{clientId}` service key)

## Quick Reference

| Command | Description |
|---------|-------------|
| `exec` | Execute a service command through the |
| `status` | Show gateway status: services, kill |
| `kill` | Activate kill switch (global or |
| `resume` | Deactivate kill switch (global or |
| `services` | List registered services from |
| `usage` | Query usage logs |

---

## exec

Execute a service command through the

```bash
gateway-cc exec [options] <service> <command> [args...]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `service` | Yes | Service name (e.g., analyze-media) |
| `command` | Yes | Command to run (e.g., analyze) |
| `args` | Yes | Arguments to pass to the command |

---

## status

Show gateway status: services, kill

```bash
gateway-cc status [options]
```

---

## kill

Activate kill switch (global or

```bash
gateway-cc kill [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-s, --service <name>` | Yes | Service to kill (omit for global) |
| `-r, --reason <reason>` | Yes | Reason for killing |

---

## resume

Deactivate kill switch (global or

```bash
gateway-cc resume [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-s, --service <name>` | Yes | Service to resume (omit for global) |

---

## services

List registered services from

```bash
gateway-cc services [options]
```

---

## usage

Query usage logs

```bash
gateway-cc usage [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-s, --service <name>` | Yes | Filter by service |
| `-l, --limit <n>` | No | Number of entries (default: 20) |

---
