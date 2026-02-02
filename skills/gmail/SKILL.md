---
name: manage-gmail
description: Gmail integration via CLI. Triggers on "email", "gmail", "draft email", "inbox".
metadata: {"clawdbot":{"emoji":"✉️"}}
---

# Gmail Integration

Use the `gmail` service via gateway-cc for email operations.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail <command> [options]
```

## Commands

### auth
Check or manage authentication.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail auth
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail auth --status
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail auth --logout
```
**Options:** `--status`, `--logout`

### list
List recent emails.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail list
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail list -l 20
```
**Options:** `-l <limit>`

### read
Read a specific email.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail read <id>
```

### search
Search emails.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail search "from:user@example.com subject:invoice"
```

### draft
Create an email draft.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail draft --to "user@example.com" --subject "Subject" --body "Body text"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail draft --to "a@example.com" --cc "b@example.com" --bcc "c@example.com" --subject "Subject" --body "Body"
```
**Required:** `--to`, `--subject`, `--body`
**Options:** `--cc`, `--bcc`

### reply
Reply to an email.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail reply <id> --body "Reply text"
```
**Required:** `--body`

### drafts list
List all drafts.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail drafts list
```

### drafts delete
Delete a draft.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec gmail drafts delete <id>
```
