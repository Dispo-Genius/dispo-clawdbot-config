# gleap-cc

Gleap CLI for Claude Code / Clawdbot - Customer service integration for Dispo Genius.

## Setup

```bash
gateway-cc keys set GLEAP_API_KEY
gateway-cc keys set GLEAP_PROJECT_ID
```

## Commands

### sync
Sync project metadata and cache users.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts sync
```

### list-tickets
List tickets with optional filters.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts list-tickets [options]
```
Options:
- `-s, --status <status>` - Filter: OPEN, INPROGRESS, CLOSED
- `-p, --priority <priority>` - Filter: LOW, MEDIUM, HIGH, URGENT
- `-l, --limit <number>` - Max results (default: 25)
- `--skip <number>` - Pagination offset
- `--sort <field>` - Sort: -createdAt, createdAt, -priority
- `-a, --assignee <id>` - Filter by assignee
- `--search <query>` - Search tickets

### get-ticket
Get ticket details with conversation history.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts get-ticket <id>
```

### reply-ticket
Send a reply to a ticket.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts reply-ticket <id> "<message>"
```
Options:
- `--internal` - Mark as internal note (not visible to customer)

### update-ticket
Update ticket properties.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts update-ticket <id> [options]
```
Options:
- `-s, --status <status>` - Set status
- `-p, --priority <priority>` - Set priority
- `-a, --assignee <id>` - Assign to user
- `-t, --tag <tags...>` - Set tags
- `--add-tag <tag>` - Add single tag

### close-ticket
Close a ticket with optional resolution note.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts close-ticket <id> [options]
```
Options:
- `-n, --note <text>` - Resolution note
- `--internal` - Make note internal only

### search-kb
Search knowledge base articles.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts search-kb "<query>" [options]
```
Options:
- `-l, --limit <number>` - Max results (default: 5)

### get-user
Get user profile and history.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts get-user <id> [options]
```
Options:
- `--tickets` - Include recent tickets

### create-outreach
Send proactive outreach message.
```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts create-outreach <userId> "<message>" [options]
```
Options:
- `-t, --title <title>` - Conversation subject
- `--channel <channel>` - Channel: email, widget, whatsapp

## Output Format

Use `-f json` for full JSON output, default is compact.

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts -f json list-tickets
```

## API Reference

- Base URL: `https://api.gleap.io/v3`
- Rate limit: 1000 requests / 60 seconds
- Auth: Bearer token + Api-Token header
