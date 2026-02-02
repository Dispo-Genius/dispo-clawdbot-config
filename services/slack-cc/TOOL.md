# slack-cc

CLI reference for `slack-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `sync` | Sync workspace channels and members from Slack API |
| `send-message` | Send a message to a Slack channel |
| `schedule-message` | Schedule a message to be sent to a Slack channel at a future time |
| `send-dm` | Send a direct message to a Slack user |
| `list-channels` | List available Slack channels |
| `list-members` | List Slack workspace members |
| `get-history` | Get message history from a Slack channel |
| `upload-file` | Upload a file to a Slack channel or user DM |
| `edit-message` | Edit an existing message in a Slack channel |
| `delete-message` | Delete a message from a Slack channel |
| `send-rich-message` | Send a rich message with blocks or attachments to a Slack channel |
| `create-channel` | Create a new Slack channel |

---

## sync

Sync workspace channels and members from Slack API

```bash
slack-cc sync [options]
```

---

## send-message

Send a message to a Slack channel

```bash
slack-cc send-message [options] <channel> <message>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (with or without # prefix) |
| `message` | Yes | Message text (supports Slack markdown and @mentions) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--thread <ts>` | Yes | Thread timestamp to reply to |
| `--mention <names>` | Yes | Comma-separated names to @mention at start of message |

---

## schedule-message

Schedule a message to be sent to a Slack channel at a future time

```bash
slack-cc schedule-message [options] <channel> <message> <post_at>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (with or without # prefix) |
| `message` | Yes | Message text (supports Slack markdown) |
| `post_at` | Yes | Unix timestamp OR relative time (e.g., "tomorrow 7am", "in 2 |

---

## send-dm

Send a direct message to a Slack user

```bash
slack-cc send-dm [options] <user> <message>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `user` | Yes | User name (display name or real name, with or without @ prefix) |
| `message` | Yes | Message text (supports Slack markdown and @mentions) |

---

## list-channels

List available Slack channels

```bash
slack-cc list-channels [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--filter <term>` | Yes | Filter channels by name substring |
| `--limit <n>` | No | Maximum number of results (default: 50) |

---

## list-members

List Slack workspace members

```bash
slack-cc list-members [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--filter <term>` | Yes | Filter members by name (display name or real name) |
| `--limit <n>` | No | Maximum number of results (default: 100) |

---

## get-history

Get message history from a Slack channel

```bash
slack-cc get-history [options] <channel>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (with or without # prefix) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--limit <n>` | No | Number of messages to fetch (default: 20) |
| `--user <id>` | Yes | Filter messages by user ID |

---

## upload-file

Upload a file to a Slack channel or user DM

```bash
slack-cc upload-file [options] [channel] [filepath]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (required unless --user is specified) |
| `filepath` | Yes | Path to the file to upload |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--user <name>` | Yes | Upload to user DM instead of channel |
| `--file <path>` | Yes | Path to file (alternative to filepath argument) |
| `--thread <ts>` | Yes | Thread timestamp to upload to |
| `--title <title>` | Yes | Title for the file (defaults to filename) |
| `--comment <comment>` | Yes | Initial comment to post with the file |

---

## edit-message

Edit an existing message in a Slack channel

```bash
slack-cc edit-message [options] <channel> <timestamp> <message>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (with or without # prefix) |
| `timestamp` | Yes | Message timestamp (ts) to edit |
| `message` | Yes | New message text |

---

## delete-message

Delete a message from a Slack channel

```bash
slack-cc delete-message [options] <channel> <timestamp>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (with or without # prefix) |
| `timestamp` | Yes | Message timestamp (ts) to delete |

---

## send-rich-message

Send a rich message with blocks or attachments to a Slack channel

```bash
slack-cc send-rich-message [options] <channel> [text]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `channel` | Yes | Channel name (with or without # prefix) |
| `text` | Yes | Fallback text (shown in notifications) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--thread <ts>` | Yes | Thread timestamp to reply to |
| `--blocks <json>` | Yes | JSON array of Slack Block Kit blocks |
| `--attachments <json>` | Yes | JSON array of Slack attachments |

---

## create-channel

Create a new Slack channel

```bash
slack-cc create-channel [options] <name>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `name` | Yes | Channel name (without # prefix) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--private` | No | Create a private channel |
| `--description <text>` | Yes | Channel description/purpose |

---
