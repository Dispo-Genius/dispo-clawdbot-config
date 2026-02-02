# MCP vs CLI Tools

Why CLI tools are preferred over MCP servers.

## Comparison

| Aspect | CLI Tools | MCP Servers |
|--------|-----------|-------------|
| Debugging | Run directly in terminal | Requires server logs |
| Dependencies | Node/npm only | Server runtime needed |
| Version control | Easy to track changes | Config harder to diff |
| Offline | Works completely offline | May need network |
| Invocation | Direct from skills/agents | Via MCP protocol |
| Startup | Instant | Server spin-up time |
| Error handling | Standard stderr/exit codes | Protocol-specific |

## CLI Tool Pattern

```bash
npx tsx .claude/tools/{tool}/src/index.ts {command} [args]
```

Example structure:
```
tools/
└── linear-cc/
    ├── src/
    │   └── index.ts
    ├── package.json
    └── README.md
```

## When to Use MCP

MCPs still make sense for:
- Real-time data streams
- Persistent connections (WebSocket)
- Third-party managed services
- Complex auth flows that need refresh

## Conversion Candidates

| MCP Pattern | CLI Alternative |
|-------------|-----------------|
| Simple API calls | CLI wrapper with env var auth |
| File operations | Direct Node.js file APIs |
| Database queries | CLI with connection string |
| HTTP requests | CLI with fetch |

## Migration Steps

1. **Identify MCP functionality** - What commands does it expose?
2. **Create CLI wrapper** - Single entry point with subcommands
3. **Handle auth** - Env vars for tokens, keychain for sensitive
4. **Test offline** - Verify works without network where possible
5. **Update skills** - Change invocation from MCP to CLI
6. **Remove MCP config** - Clean up .mcp.json entry

## CLI Tool Standards

| Standard | Requirement |
|----------|-------------|
| Entry point | `src/index.ts` with commander |
| Help | `--help` shows all commands |
| Exit codes | 0 success, 1 error |
| Output | JSON for parsing, text for humans |
| Errors | stderr with clear message |

## Example CLI Structure

```typescript
// src/index.ts
import { Command } from 'commander';

const program = new Command()
  .name('tool-name')
  .description('Tool description');

program
  .command('action')
  .description('Do something')
  .option('-f, --flag', 'Flag description')
  .action(async (options) => {
    // Implementation
  });

program.parse();
```
