---
name: gmail
description: Gmail integration for reading and drafting emails. Triggers on "email", "gmail", "draft email", "inbox", "read email", "send email".
metadata: {"clawdbot":{"emoji":"📧","requires":{"env":["GMAIL_CLIENT_ID","GMAIL_CLIENT_SECRET"]}}}
---

# Gmail Integration

Use the `gmail` service via gateway-cc for all Gmail operations.

```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail <command> [options]
```

## Commands

### auth
Authenticate with Gmail (required first time).
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail auth
```

### list
List recent emails.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail list

# Options
--limit <n>       Max results (default 10)
--label <label>   Filter by label (INBOX, SENT, DRAFT, etc.)
```

### read
Read a specific email.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail read <message-id>
```

### search
Search emails.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail search "query string"

# Options
--limit <n>       Max results (default 10)

# Examples
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail search "from:someone@example.com"
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail search "subject:meeting after:2024/01/01"
```

### draft
Create a draft email.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail draft --to "recipient@example.com" --subject "Subject" --body "Email body"

# Options
--to <email>        Recipient (required)
--subject <text>    Subject line (required)
--body <text>       Email body (required)
--cc <emails>       CC recipients (comma-separated)
--bcc <emails>      BCC recipients (comma-separated)
```

### drafts
List draft emails.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail drafts

# Options
--limit <n>       Max results (default 10)
```

### reply
Reply to an email.
```bash
npx tsx ~/.claude/skills/manage-gateway/service/src/index.ts exec gmail reply <message-id> --body "Reply text"

# Options
--body <text>       Reply body (required)
--cc <emails>       CC recipients
```

## Response Format

**Success:**
```json
{"success": true, "messageId": "...", "threadId": "..."}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```

## Gmail Search Operators

- `from:` - Sender
- `to:` - Recipient
- `subject:` - Subject contains
- `after:` / `before:` - Date (YYYY/MM/DD)
- `is:unread` - Unread messages
- `has:attachment` - Has attachments
- `label:` - Has label
