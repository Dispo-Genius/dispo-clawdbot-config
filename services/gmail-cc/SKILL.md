# gmail-cc

Gmail CLI tool for Claude Code.

## CRITICAL RULES

**NEVER send emails automatically.** This tool intentionally has NO send capability.

1. **Draft only**: All compose commands create drafts - they do NOT send emails
2. **Human review required**: User must open Gmail to review and manually send any draft
3. **Explicit approval**: Before creating ANY draft, you MUST:
   - Show the user the exact recipient, subject, and body
   - Get explicit verbal/written approval ("yes, create that draft")
   - Never assume approval based on context

## Commands

| Command | Description |
|---------|-------------|
| `auth` | Run OAuth flow (first-time setup) |
| `auth --status` | Check authentication status |
| `auth --logout` | Clear saved tokens |
| `list [--limit N]` | List recent emails |
| `read <messageId>` | Read email content |
| `search <query>` | Search emails (Gmail query syntax) |
| `draft --to --subject --body` | Create draft (NOT send) |
| `reply <messageId> --body` | Create reply draft (NOT send) |
| `drafts list` | List all drafts |
| `drafts delete <draftId>` | Delete a draft |

## Output Formats

All commands support output format options:
- `-f, --format <format>`: json (default), table, quiet
- `-q, --quiet`: Suppress output

## Usage

```bash
# Alias (optional)
alias gmail='npx tsx ~/.claude/tools/gmail-cc/src/index.ts'

# Authenticate
gmail auth
gmail auth --status
gmail auth --logout

# List emails
gmail list --limit 5
gmail list --format table

# Read specific email
gmail read <messageId>

# Search
gmail search "from:someone@gmail.com"
gmail search "is:unread" --limit 20
gmail search "subject:invoice after:2024/01/01"

# Create draft (requires user approval first!)
gmail draft --to "someone@example.com" --subject "Subject" --body "Body text"
gmail draft --to "a@b.com" --cc "c@d.com,e@f.com" --subject "Hi" --body "Hello"

# Reply to email (creates draft)
gmail reply <messageId> --body "Thanks for your email!"

# Manage drafts
gmail drafts list
gmail drafts delete <draftId>
```

## Workflow for Creating Emails

1. User requests an email be composed
2. Claude drafts the content and presents for review:
   ```
   To: recipient@example.com
   CC: (none)
   Subject: Your subject here

   Body:
   Your message here
   ```
3. User explicitly approves ("yes", "looks good", "create it")
4. Claude runs `draft` command
5. User opens Gmail to review and send manually

## Input Validation

The tool validates:
- Email format (RFC-compliant)
- Subject length (max 998 chars per RFC 2822)
- Body size (max 25MB)
- Required fields

## Error Handling

- Automatic retry on network errors (3 attempts with exponential backoff)
- Clear error messages with actionable guidance
- Port fallback if default OAuth port is busy

## Search Query Examples

- `from:someone@gmail.com` - From specific sender
- `to:me` - Sent to you
- `subject:invoice` - Subject contains word
- `is:unread` - Unread messages
- `is:starred` - Starred messages
- `has:attachment` - Has attachments
- `filename:pdf` - Has PDF attachment
- `after:2024/01/01` - After date
- `before:2024/12/31` - Before date
- `older_than:7d` - Older than 7 days
- `newer_than:1h` - Newer than 1 hour
- `label:important` - Has label
- `in:inbox` - In inbox
- `in:sent` - In sent folder
- `larger:5M` - Larger than 5MB
- `"exact phrase"` - Exact phrase match
