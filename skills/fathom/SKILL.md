---
name: manage-fathom
description: Fathom meeting notes integration via CLI. Triggers on "meeting notes", "fathom", "transcript", "action items".
metadata: {"clawdbot":{"emoji":"🎙️"}}
---

# Fathom Integration

Use the `fathom` service via gateway-cc for meeting notes and transcripts.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom <command> [options]
```

## Commands

### list-meetings
List recent meetings.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom list-meetings
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom list-meetings --limit 10 --since 2025-01-01 --until 2025-01-31
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom list-meetings --include-summary
```
**Options:** `--limit <N>`, `--since <date>`, `--until <date>`, `--include-summary`

### get-meeting
Get meeting details.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom get-meeting <id>
```

### get-transcript
Get full transcript for a meeting.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom get-transcript <id>
```

### get-summary
Get AI-generated summary for a meeting.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom get-summary <id>
```

### get-action-items
Get action items from a meeting.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom get-action-items <id>
```

### search
Search across meetings.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom search "keyword"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom search "investor feedback" --limit 5
```
**Options:** `--limit <N>`

### list-team
List team members with Fathom access.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec fathom list-team
```
