# analyze-media-cc

CLI reference for `analyze-media-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `analyze` | Analyze visual media (images, videos, GIFs) |
| `generate` | Generate images from media using a two-step |

---

## analyze

Analyze visual media (images, videos, GIFs)

```bash
analyze-media-cc analyze [options] <files...>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `files` | Yes | Path(s) to media files or glob patterns (e.g., |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --prompt <prompt>` | Yes | What to look for in the media |
| `-f, --format <format>` | Yes | Output format: compact, json, table (default: |
| `-v, --verbose` | No | Include raw response in output (default: false) |
| `--chunk <duration>` | Yes | Chunk duration for video splitting (e.g., 30s, 5m, |
| `--mode <mode>` | Yes | Split analysis mode: parallel or sequential (default: |
| `--no-compress` | No | Error instead of compressing oversized chunks |

---

## generate

Generate images from media using a two-step

```bash
analyze-media-cc generate [options] <files...>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `files` | Yes | Path(s) to media files or glob patterns |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-p, --prompt <prompt>` | Yes | Description of what to generate |
| `-o, --output <dir>` | Yes | Output directory for generated images |
| `--aspect-ratio <ratio>` | Yes | Aspect ratio for generated image (e.g., 16:9, 1:1, |
| `--image-size <size>` | Yes | Image size for generated image (e.g., 1024x1024) |
| `--no-analyze` | No | Skip analysis step, go straight to prompt creation |
| `--chunk <duration>` | Yes | Chunk duration for large video splitting (e.g., 30s, |
| `--no-compress` | No | Error instead of compressing oversized video chunks |
| `-f, --format <format>` | Yes | Output format: compact, json, table (default: |
| `-v, --verbose` | No | Show intermediate prompt and analysis (default: |

---
