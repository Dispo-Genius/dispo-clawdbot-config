---
name: manage-analyze-media
description: Media analysis integration via CLI. Triggers on "analyze image", "analyze video", "visual analysis", "screenshot analysis".
metadata: {"clawdbot":{"emoji":"🖼️"}}
---

# Media Analysis Integration

Use the `analyze-media` service via gateway-cc for image/video analysis and generation.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media <command> [options]
```

## Commands

### analyze
Analyze images or videos with AI.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze screenshot.png -p "Describe the UI layout"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze *.png -p "Compare these designs"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze video.mp4 -p "Summarize this recording" --chunk 30
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze large-video.mp4 -p "Find errors" --mode parallel --no-compress
```
**Required:** `<files...>`, `-p <prompt>`
**Options:**
- `--chunk <seconds>` — Split video into chunks of N seconds
- `--mode <sequential|parallel>` — Processing mode (default: sequential)
- `--no-compress` — Skip image compression

Supports globs (e.g., `*.png`, `screenshots/*.jpg`). Videos are auto-split for processing.

### generate
Generate images from text prompts.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media generate "A modern dashboard with dark theme"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media generate "Icon set for real estate app" --size 512x512 --count 4
```
**Options:** `--size <WxH>`, `--count <N>`
