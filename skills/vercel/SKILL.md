---
name: manage-vercel
description: Vercel deployment integration via CLI. Triggers on "deploy", "vercel", "environment variables", "domains".
metadata: {"clawdbot":{"emoji":"🚀"}}
---

# Vercel Integration

Use the `vercel` service via gateway-cc for deployment and project management.

```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel <command> [options]
```

## Commands

### list-projects
List all Vercel projects.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-projects
```

### get-project
Get project details.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel get-project <id>
```

### list-deployments
List deployments.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-deployments
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-deployments --project dg-prototype --state READY
```
**Options:** `--project <name>`, `--state <state>`

### get-deployment
Get deployment details.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel get-deployment <id>
```

### promote
Promote a deployment to production.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel promote <id>
```

### cancel-deployment
Cancel an in-progress deployment.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel cancel-deployment <id>
```

### list-env
List environment variables.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-env
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-env --project dg-prototype
```
**Options:** `--project <name>`

### add-env
Add an environment variable.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel add-env dg-prototype MY_VAR "value"
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel add-env dg-prototype MY_VAR "value" --target production
```
**Options:** `--target <environment>`

### remove-env
Remove an environment variable.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel remove-env dg-prototype MY_VAR
```

### list-domains
List domains.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-domains
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel list-domains --project dg-prototype
```
**Options:** `--project <name>`

### add-domain
Add a domain to a project.
```bash
npx tsx ~/.claude/tools/gateway-cc/src/index.ts exec vercel add-domain dg-prototype custom.example.com
```
