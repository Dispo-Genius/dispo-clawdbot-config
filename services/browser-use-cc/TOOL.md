# browser-use-cc

AI-driven browser automation using Python `browser-use` library with Brave browser.

## Commands

### run

Execute an AI-driven browser task.

```bash
gateway-cc exec browser-use run --task "Navigate to example.com and click login"

# With options
gateway-cc exec browser-use run --task "..." --timeout 300 --headless --screenshot /tmp/result.png
```

**Options:**
- `--task <task>` (required): Task description for the AI
- `--timeout <seconds>`: Timeout in seconds (default: 300 / 5 minutes)
- `--headless`: Run browser without visible window
- `--screenshot <path>`: Save screenshot after task completion

**Output:**
```json
{
  "success": true,
  "result": "Task completed successfully",
  "screenshot": "/tmp/result.png"
}
```

### status

Check dependencies and current state.

```bash
gateway-cc exec browser-use status
```

**Output:**
```json
{
  "brave": {
    "installed": true,
    "path": "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "cdpRunning": true,
    "cdpPort": 9222
  },
  "browserUse": {
    "installed": true
  },
  "capsolver": {
    "configured": true
  },
  "profile": {
    "path": "~/.config/brave-cdp-profile"
  }
}
```

## Dependencies

- **Brave Browser**: `/Applications/Brave Browser.app/`
- **Python 3.11+** with `browser-use` package: `pip install browser-use`
- **CapSolver API key** (optional): For CAPTCHA solving

## Configuration

### API Keys

Set via gateway credentials:

```bash
gateway-cc keys set CAPSOLVER_API_KEY
```

### Gateway Settings

- `concurrency: 1` - Only one browser task at a time
- Auto-approval: `status` command
- Requires approval: `run` command

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Brave not found | Brave not installed | Install from https://brave.com |
| Port 9222 in use | Another process using CDP port | `lsof -i :9222` to identify |
| browser-use not found | Python package missing | `pip install browser-use` |
| Task timeout | Task exceeded timeout | Increase `--timeout` or simplify task |
| CAPSOLVER_API_KEY not set | Key not configured | `gateway-cc keys set CAPSOLVER_API_KEY` |

## Architecture

```
Claude Code --> gateway-cc exec --> browser-use-cc (TS) --> runner.py (Python) --> Brave (CDP:9222)
                     |
                     v
             Gateway /anthropic proxy --> Anthropic API
```

## Notes

- Brave stays running after tasks complete (reused for subsequent tasks)
- Single shared browser profile at `~/.config/brave-cdp-profile/`
- CDP port 9222 is shared with `agent-browser` tool
