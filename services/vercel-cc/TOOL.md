# vercel-cc

CLI reference for `vercel-cc`. Auto-generated from Commander.js definitions.

## Quick Reference

| Command | Description |
|---------|-------------|
| `sync` | Sync Vercel projects and cache metadata locally |
| `list-projects` | List all Vercel projects |
| `get-project` | Get details of a specific Vercel project |
| `list-deployments` | List deployments for a project |
| `get-deployment` | Get details of a specific deployment |
| `promote` | Promote a deployment to production (no rebuild) |
| `cancel-deployment` | Cancel an in-progress or queued deployment |
| `list-env` | List environment variables for a project |
| `add-env` | Add an environment variable to a project |
| `remove-env` | Remove an environment variable from a project |
| `list-domains` | List domains for a project |
| `add-domain` | Add a domain to a project |

---

## sync

Sync Vercel projects and cache metadata locally

```bash
vercel-cc sync [options]
```

---

## list-projects

List all Vercel projects

```bash
vercel-cc list-projects [options]
```

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--cached` | No | Use cached data instead of fetching from API |
| `--limit <number>` | No | Maximum number of projects to return (default: 100) |

---

## get-project

Get details of a specific Vercel project

```bash
vercel-cc get-project [options] <project>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |

---

## list-deployments

List deployments for a project

```bash
vercel-cc list-deployments [options] [project]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name (optional, lists all if omitted) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--limit <number>` | No | Maximum number of deployments to return (default: 20) |

---

## get-deployment

Get details of a specific deployment

```bash
vercel-cc get-deployment [options] <deployment>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `deployment` | Yes | Deployment ID or URL |

---

## promote

Promote a deployment to production (no rebuild)

```bash
vercel-cc promote [options] <project> <deployment>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |
| `deployment` | Yes | Deployment ID to promote |

---

## cancel-deployment

Cancel an in-progress or queued deployment

```bash
vercel-cc cancel-deployment [options] <deployment>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `deployment` | Yes | Deployment ID to cancel |

---

## list-env

List environment variables for a project

```bash
vercel-cc list-env [options] <project>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--show-values` | No | Show decrypted values (if available) |

---

## add-env

Add an environment variable to a project

```bash
vercel-cc add-env [options] <project> <key> <value>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |
| `key` | Yes | Environment variable key |
| `value` | Yes | Environment variable value |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--target <targets>` | Yes | Comma-separated targets: production,preview,development |
| `--type <type>` | Yes | Variable type: plain, secret, encrypted, sensitive |
| `--comment <comment>` | Yes | Description/comment for the variable |

---

## remove-env

Remove an environment variable from a project

```bash
vercel-cc remove-env [options] <project> <key-or-id>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |
| `key-or-id` | Yes | Environment variable key or ID |

---

## list-domains

List domains for a project

```bash
vercel-cc list-domains [options] <project>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |

---

## add-domain

Add a domain to a project

```bash
vercel-cc add-domain [options] <project> <domain>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `project` | Yes | Project ID or name |
| `domain` | Yes | Domain name to add (e.g., www.example.com) |

**Options:**

| Flag | Required | Description |
|------|----------|-------------|
| `--git-branch <branch>` | Yes | Git branch to associate with domain |
| `--redirect <target>` | Yes | Redirect to another domain |
| `--redirect-code <code>` | Yes | Redirect status code: 301, 302, 307, 308 (default: |

---
