# polaris-cc

CLI reference for `polaris-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `send` | Send a text message to Polaris and get a |
| `send-image` | Send an image (with optional text) to |
| `status` | Check gateway health, channel status, and |
| `sessions` | List conversation sessions |
| `read` | Read recent messages from a session |

---

## send

Send a text message to Polaris and get a

```bash
polaris-cc send [options] <message>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `message` | Yes | Message text to send |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--agent <id>` | Yes | Target a specific agent |
| `--session-id <id>` | Yes | Explicit session id |
| `--thinking <level>` | Yes | Thinking level: off, minimal, low, medium, high |
| `--timeout <seconds>` | No | Timeout in seconds (default: 600) |

---

## send-image

Send an image (with optional text) to

```bash
polaris-cc send-image [options] <image-path>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `image-path` | Yes | Path to the image file |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-m, --message <text>` | Yes | Optional text message to accompany the image |
| `--agent <id>` | Yes | Target a specific agent |
| `--session-id <id>` | Yes | Explicit session id |
| `--timeout <seconds>` | No | Timeout in seconds (default: 600) |

---

## status

Check gateway health, channel status, and

```bash
polaris-cc status [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--deep` | No | Probe channels (WhatsApp, Telegram, Discord, Slack, Signal) |
| `--usage` | No | Include model provider usage/quota snapshots |
| `--timeout <ms>` | No | Probe timeout in ms (default: 10000) |

---

## sessions

List conversation sessions

```bash
polaris-cc sessions [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--active <minutes>` | Yes | Filter to sessions updated within N minutes |

---

## read

Read recent messages from a session

```bash
polaris-cc read [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--session-id <id>` | Yes | Session id to read from |
| `--limit <n>` | No | Max messages to return (default: 20) |
| `--channel <channel>` | Yes | Filter by channel (whatsapp, telegram, discord, etc.) |

---
