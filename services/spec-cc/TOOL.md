# spec-cc

CLI reference for `spec-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `list` | List all specs with status |
| `info` | Show spec metadata and path |
| `status` | Update spec status |
| `restructure` | Convert flat spec to folder structure |
| `index` | Regenerate INDEX.md from spec files |

---

## list

List all specs with status

```bash
spec-cc list [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `-s, --status <status>` | Yes | Filter by status |

---

## info

Show spec metadata and path

```bash
spec-cc info [options] <slug>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `slug` | Yes | Spec slug (filename without .md) |

---

## status

Update spec status

```bash
spec-cc status [options] <slug> <status>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `slug` | Yes | Spec slug |
| `status` | Yes | New status (draft|pending|approved|blocked|completed) |

---

## restructure

Convert flat spec to folder structure

```bash
spec-cc restructure [options] <slug>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `slug` | Yes | Spec slug |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--dry-run` | No | Show what would be done without making changes |

---

## index

Regenerate INDEX.md from spec files

```bash
spec-cc index [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--check` | No | Verify INDEX.md is in sync without modifying |

---
