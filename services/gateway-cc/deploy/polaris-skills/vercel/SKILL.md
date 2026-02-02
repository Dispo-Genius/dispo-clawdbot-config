---
name: vercel
description: Vercel deployment management. List deployments, manage domains, environment variables. Triggers on "deploy", "vercel", "deployment", "environment variables", "domains".
metadata: {"clawdbot":{"emoji":"▲","requires":{"env":["VERCEL_TOKEN"]}}}
---

# Vercel Integration

Use the `vercel` service via gateway-cc for all Vercel operations.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel <command> [options]
```

## Commands

### sync
Sync projects cache. **Run once before other commands.**
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel sync
```

### list-projects
List all projects.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-projects
```

### get-project
Get project details.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel get-project <project-name>
```

### list-deployments
List recent deployments.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-deployments

# Options
--project <name>    Filter by project
--limit <n>         Max results (default 10)
--state <state>     Filter by state (READY, ERROR, BUILDING, QUEUED, CANCELED)
```

### get-deployment
Get deployment details.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel get-deployment <deployment-id>
```

### cancel-deployment
Cancel a running deployment.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel cancel-deployment <deployment-id>
```

### promote
Promote a deployment to production.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel promote <deployment-id>
```

### list-env
List environment variables.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-env <project-name>

# Options
--env <environment>   Filter by environment (production, preview, development)
```

### add-env
Add an environment variable.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel add-env <project-name> <key> <value>

# Options
--env <environment>   Target environment (default: all)
```

### remove-env
Remove an environment variable.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel remove-env <project-name> <key>

# Options
--env <environment>   Target environment
```

### list-domains
List project domains.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-domains <project-name>
```

### add-domain
Add a domain to a project.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel add-domain <project-name> <domain>
```

## Response Format

**Success:**
```json
{"success": true, "deploymentId": "...", "url": "..."}
```

**Error:**
```json
{"success": false, "error": "Error message"}
```

## Deployment States
READY, ERROR, BUILDING, QUEUED, CANCELED
