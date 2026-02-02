# gmail-cc

CLI reference for `gmail-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `auth` | Authenticate with Gmail using OAuth |
| `list` | List recent emails |
| `read` | Read email content by message ID |
| `draft` | Create an email draft (does NOT send) |
| `search` | Search emails using Gmail query syntax |
| `drafts` | Commands:
  list [options]              List all drafts
  delete [options] <draftId>  Delete a draft
  help [command]              display help for command |
| `reply` | Create a reply draft to a message (does NOT |

---

## auth

Authenticate with Gmail using OAuth

```bash
gmail-cc auth [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--logout` | No | Clear saved tokens and logout |
| `--status` | No | Check authentication status |

---

## list

List recent emails

```bash
gmail-cc list [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-l, --limit <number>` | No | Number of emails to list (default: 10) |
| `-f, --format <format>` | No | Output format: json, table, quiet (default: json) |
| `-q, --quiet` | No | Suppress output (shorthand for --format quiet) |

---

## read

Read email content by message ID

```bash
gmail-cc read [options] <messageId>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-f, --format <format>` | No | Output format: json, table, quiet (default: json) |
| `-q, --quiet` | No | Suppress output (shorthand for --format quiet) |

---

## draft

Create an email draft (does NOT send)

```bash
gmail-cc draft [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--to <email>` | Yes | Recipient email address |
| `--subject <subject>` | Yes | Email subject |
| `--body <body>` | Yes | Email body |
| `--cc <email>` | Yes | CC recipient(s), comma-separated |
| `--bcc <email>` | Yes | BCC recipient(s), comma-separated |
| `--html` | No | Send as HTML email (auto-detected if body contains |
| `-f, --format <format>` | No | Output format: json, table, quiet (default: json) |
| `-q, --quiet` | No | Suppress output (shorthand for --format quiet) |

---

## search

Search emails using Gmail query syntax

```bash
gmail-cc search [options] <query>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-l, --limit <number>` | No | Max results to return (default: 10) |
| `-f, --format <format>` | No | Output format: json, table, quiet (default: json) |
| `-q, --quiet` | No | Suppress output (shorthand for --format quiet) |

---

## drafts

Commands:
  list [options]              List all drafts
  delete [options] <draftId>  Delete a draft
  help [command]              display help for command

```bash
gmail-cc drafts [options] [command]
```

---

## reply

Create a reply draft to a message (does NOT

```bash
gmail-cc reply [options] <messageId>
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--body <body>` | Yes | Reply body |
| `-f, --format <format>` | No | Output format: json, table, quiet (default: json) |
| `-q, --quiet` | No | Suppress output (shorthand for --format quiet) |

---
