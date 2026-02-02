---
name: analyze-media
description: Visual analysis of images and videos using AI. Triggers on "analyze image", "analyze video", "visual analysis", "screenshot analysis", "what's in this image".
metadata: {"clawdbot":{"emoji":"🖼️","requires":{"env":["GEMINI_AI_KEY"]}}}
---

# Analyze Media Integration

Use the `analyze-media` service via gateway-cc for visual analysis.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media <command> [options]
```

## Commands

### analyze
Analyze an image or video file.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze <file-path> [prompt]

# Arguments
file-path    Path to image or video file
prompt       Optional analysis prompt (default: "Describe this image in detail")

# Examples
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze /tmp/screenshot.png
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze /tmp/screenshot.png "What UI elements are visible?"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media analyze /tmp/demo.mp4 "Summarize this video"
```

### generate
Generate an image from text description.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media generate "description" --output <path>

# Options
--output <path>     Output file path (required)
--size <size>       Image size (default: 1024x1024)

# Example
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec analyze-media generate "A modern dashboard UI" --output /tmp/mockup.png
```

## Supported Formats

### Images
- PNG, JPG, JPEG, GIF, WebP

### Videos
- MP4, MOV, WebM (extracted as frames)

## Response Format

**Success:**
```json
{"success": true, "analysis": "Detailed description...", "model": "gemini-pro-vision"}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```

## Use Cases

- Analyze screenshots for UI review
- Extract text from images (OCR)
- Describe video content
- Verify visual changes
- Generate mockups
