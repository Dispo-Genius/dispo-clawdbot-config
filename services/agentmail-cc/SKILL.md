# agentmail-cc

CLI tool for AgentMail email integration.

## Trigger Phrases

- agentmail
- agent inbox
- agent email

## Quick Reference

| Command | Description |
|---------|-------------|
| `auth --status` | Check API key status |
| `inbox create` | Create new inbox |
| `inbox list` | List all inboxes |
| `inbox get <id>` | Get inbox details |
| `send <inboxId>` | Send email from inbox |
| `list <inboxId>` | List messages in inbox |
| `read <inboxId> <messageId>` | Read message content |

## Commands

### auth

Check AgentMail API key status.

```bash
agentmail-cc auth --status
```

### inbox create

Create a new inbox with optional display name.

```bash
agentmail-cc inbox create [--display-name <name>]
```

### inbox list

List all inboxes.

```bash
agentmail-cc inbox list
```

### inbox get

Get inbox details by ID.

```bash
agentmail-cc inbox get <inboxId>
```

### send

Send email from an inbox.

```bash
agentmail-cc send <inboxId> --to <email> --subject <subject> --text <body>
```

**Options:**
- `--to <email>` - Recipient email address (required)
- `--subject <subject>` - Email subject (required)
- `--text <text>` - Email body plain text (required)
- `--html <html>` - Email body HTML (optional)

### list

List messages in an inbox.

```bash
agentmail-cc list <inboxId> [-l, --limit <number>]
```

### read

Read message content by ID.

```bash
agentmail-cc read <inboxId> <messageId>
```

## Configuration

Add `AGENTMAIL_KEY` to `~/.claude/.env`:

```
AGENTMAIL_KEY=your_api_key_here
```

Get your API key from https://agentmail.to
