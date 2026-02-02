---
name: manage-polaris
description: Polaris AI integration via CLI. Triggers on "polaris", "ask polaris", "ai analysis".
metadata: {"clawdbot":{"emoji":"🤖"}}
---

# Polaris AI Integration

Use the `polaris` service via gateway-cc for AI analysis and conversations.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris <command> [options]
```

## Commands

### send
Send a message to Polaris.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris send "Analyze this investor portfolio"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris send "Complex question" --thinking high --timeout 60000
```
**Options:** `--thinking <level>`, `--timeout <ms>`

### send-image
Send an image for analysis.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris send-image /path/to/image.png
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris send-image /path/to/screenshot.png --prompt "What UI issues do you see?"
```
**Options:** `--prompt <text>`

### status
Check Polaris service status.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris status
```

### sessions
List recent Polaris sessions.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris sessions
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris sessions --limit 5
```
**Options:** `--limit <N>`

### read
Read a specific session transcript.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec polaris read <sessionId>
```
