---
name: manage-agentmail
description: AgentMail email integration via CLI. Triggers on "agentmail", "email inbox", "list threads", "send email", "reply email".
metadata: {"clawdbot":{"emoji":"📧"}}
---

# AgentMail Integration

Use the `agentmail` service via gateway-cc for email operations.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail <command> [options]
```

## Commands

### list-inboxes
List all configured AgentMail inboxes.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail list-inboxes
```

### get-inbox
Get details for a specific inbox.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail get-inbox <inbox-id>
```

### list-threads
List email threads in an inbox.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail list-threads <inbox-id>
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail list-threads <inbox-id> --limit 10
```
**Options:** `--limit <N>`

### get-thread
Get a specific email thread with all messages.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail get-thread <thread-id>
```

### send
Send a new email.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail send --to "user@example.com" --subject "Subject" --body "Body text"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail send --to "a@example.com" --cc "b@example.com" --subject "Subject" --body "<p>HTML body</p>"
```
**Required:** `--to`, `--subject`, `--body`
**Options:** `--cc`, `--bcc`, `--from <inbox-id>`

### reply
Reply to an existing email thread.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail reply <thread-id> --body "Reply text"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec agentmail reply <thread-id> --body "<p>HTML reply</p>"
```
**Required:** `--body`

---

## Email Formatting

When responding to emails via AgentMail, use HTML formatting instead of markdown. Email clients don't render markdown.

### Common Patterns

**Headers:**
```html
<h3>Section Title</h3>
```

**Lists:**
```html
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
```

**Paragraphs:**
```html
<p>First paragraph.</p>
<p>Second paragraph.</p>
```

**Bold/Italic:**
```html
<strong>important</strong>
<em>emphasis</em>
```

**Links:**
```html
<a href="https://example.com">Link text</a>
```

**Code:**
```html
<code>inline code</code>
<pre>code block</pre>
```

---

## Detection

Emails from AgentMail arrive with:
- `[Email from: Name <email@example.com>]` prefix
- Often contain quoted reply chains

When you see this pattern, switch to HTML formatting for your response.

---

## Example Response

Instead of markdown:
```
Here's what I found:

**Key points:**
- First thing
- Second thing

Let me know if you need more info.
```

Write HTML:
```html
<p>Here's what I found:</p>

<p><strong>Key points:</strong></p>
<ul>
  <li>First thing</li>
  <li>Second thing</li>
</ul>

<p>Let me know if you need more info.</p>
```
