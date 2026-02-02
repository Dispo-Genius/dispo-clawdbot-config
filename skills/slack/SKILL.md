---
name: manage-slack
description: Slack integration via CLI. Triggers on "send to slack", "post message", "slack notification", "dm user".
metadata: {"clawdbot":{"emoji":"💬"}}
---

# Slack Integration

Use the `slack` service via gateway-cc for all Slack operations.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack <command> [options]
```

---

## Commands

### sync
Fetch channels and members, cache locally. **Run once before other commands.**
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack sync
```

### send-message
Send a message to a channel.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message <channel> <message>

# Options
--thread <ts>       Reply in thread
--mention <names>   Comma-separated names to @mention

# Examples
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message design-studio "Deployment complete!"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message prototype-v2-updates "Update" --mention "andy,zeeshan"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message errors "Follow-up" --thread 1234567890.123456
```

### send-dm
Send a direct message to a user.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm <user> <message>

# Examples
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm zeeshan "Design polish is complete!"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm "Jane Smith" "Check out the new feature"
```

**DM Threading Pattern:** `send-dm` doesn't support `--thread`. For threaded DMs:
1. Send initial message via `send-dm`, note the `channelId` (DM channel ID like `D0A8028QJGN`)
2. Use `send-message <channelId> <msg> --thread <ts>` for replies (requires channel in allowlist)

### schedule-message
Schedule a message for future delivery.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack schedule-message <channel> <message> <post_at>

# post_at: Unix timestamp OR relative time
# Examples
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack schedule-message general "Good morning!" "tomorrow 9am"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack schedule-message releases "Deploy reminder" "in 2 hours"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack schedule-message general "Meeting" "today 3pm"
```

### list-channels
List available channels.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack list-channels

# Options
--filter <term>   Filter by name substring
--limit <n>       Max results (default 50)
```

### list-members
List workspace members.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack list-members

# Options
--filter <term>   Filter by name
--limit <n>       Max results
```

### get-history
Get message history from a channel.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack get-history <channel>

# Options
--limit <n>     Number of messages (default 20)
--user <id>     Filter by user ID

# Example
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack get-history design-studio --limit 10
```

### upload-file
Upload a file to a channel.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack upload-file <channel> <filepath>

# Options
--thread <ts>       Upload to thread
--title <title>     File title (defaults to filename)
--comment <text>    Initial comment

# Example
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack upload-file design-studio ./screenshot.png --comment "Latest design"
```

### edit-message
Edit an existing message.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack edit-message <channel> <timestamp> <message>

# Example
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack edit-message design-studio 1234567890.123456 "Updated text"
```

### delete-message
Delete a message.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack delete-message <channel> <timestamp>
```

### send-rich-message
Send a message with Block Kit blocks or attachments.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-rich-message <channel> [text]

# Options (at least one required)
--blocks <json>        JSON array of Block Kit blocks
--attachments <json>   JSON array of attachments
--thread <ts>          Reply in thread

# Example
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-rich-message releases "Deploy" \
  --blocks '[{"type":"section","text":{"type":"mrkdwn","text":"*v2.1.0* deployed"}}]'
```

### create-channel
Create a new channel.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack create-channel <name>

# Options
--private              Create private channel
--description <text>   Channel purpose

# Example
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack create-channel project-alpha --description "Alpha project discussion"
```

---

## Response Format

**Success:**
```json
{"success": true, "channel": "design-studio", "messageTs": "...", "permalink": "..."}
```

**Error:**
```json
{"success": false, "error": "Channel not found. Available: design-studio, ..."}
```

---

## Primary Channels

- `design-studio` - Design updates and reviews
- `prototype-v2-updates` - Feature and deployment notifications
- `errors` - Error alerts

---

## Formatting Guidelines

When presenting information to users in Slack (examples, data, reports), format for readability:

**Required:**
- Use code blocks (triple backticks) around JSON, code, or structured data
- Add divider lines (━━━ or ---) between distinct sections or examples
- Use bold (*text*) for headers/labels
- Use annotations (→) to explain key points

**Example structure:**
```
*TITLE*
_subtitle or count_

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Example 1: Description* (source)

\`\`\`
{structured data here}
\`\`\`
→ Annotation explaining what this shows

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Example 2: Description* (source)
...
```

**For long content:** Write to a temp file first, then pass via `$(cat /tmp/file.txt)` to avoid shell escaping issues.

---

## Long Content / Multi-Part Messages

For long content (>2000 chars) or multiple examples, use threaded replies to avoid truncation:

**Pattern for Channels:**
1. Send header message first, capture the `messageTs` from response
2. Send subsequent parts as thread replies using `--thread <ts>`

```bash
# 1. Send header, capture timestamp
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message design-studio "*V2 Examples* (5 samples)"
# Response: sent:design-studio|1706000000.000001|...

# 2. Send each example as thread reply
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message design-studio "$(cat /tmp/ex1.txt)" --thread 1706000000.000001
```

**Pattern for DMs (multiple independent threads):**
For DMs where each example should be a separate thread, send each as independent messages:
```bash
# Each message becomes its own thread starter
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm andy "$(cat /tmp/example1.txt)"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm andy "$(cat /tmp/example2.txt)"
```

**Why:** Slack truncates messages >4000 chars. Threading/splitting keeps content organized and avoids truncation.

---

## Spec Review Pattern

When posting specs for review via DM, **always use threaded replies** so the full spec doesn't clutter the main DM conversation.

1. Send a short summary as the initial DM (title, ticket, one-line description)
2. Capture the `channelId` and `messageTs` from the response
3. Post the full spec as a threaded reply using `send-message <channelId> <msg> --thread <ts>`

```bash
# 1. Send summary DM
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-dm andy "New spec: *Feature Name* (PRO-XXX) - one-line summary"
# Response: user:andy|userId:...|channelId:D0A8028QJGN|messageTs:1706000000.000001

# 2. Write full spec to temp file (avoids shell escaping)
cat > /tmp/spec-review.txt << 'EOF'
*Full spec content here...*
EOF

# 3. Post full spec as threaded reply
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec slack send-message "D0A8028QJGN" "$(cat /tmp/spec-review.txt)" --thread 1706000000.000001
```

**Why:** The DM channel gets messages from multiple Claude sessions. Without threading, specs get lost in the noise. The thread keeps the full spec attached to its summary.

---

## Error Handling

Slack updates are informational, not blocking. If sending fails, warn and continue.
