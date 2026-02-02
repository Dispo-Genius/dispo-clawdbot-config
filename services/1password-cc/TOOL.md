# 1password-cc

1Password credential storage for Polaris via op CLI. Stores and retrieves login credentials from the "Polaris" vault.

## Commands

### get
Retrieve credential by name.

```bash
gateway-cc exec 1password get <name>
# Output: name|username|password
```

### set
Store or update credential.

```bash
gateway-cc exec 1password set <name> <username> <password>
# Output: created:name
```

### list
List all credentials in vault.

```bash
gateway-cc exec 1password list
# Output: items[N]{name|username|updated}:
#         github|polaris-dg|2026-02-01
```

### delete
Remove credential (requires confirmation).

```bash
gateway-cc exec 1password delete <name> --confirmed
# Output: deleted:name
```

## Configuration

Required credentials:
- `OP_SERVICE_ACCOUNT_TOKEN` - 1Password service account token

## Error Codes

| Error | Description |
|-------|-------------|
| `op CLI not installed` | Install from https://1password.com/downloads/command-line/ |
| `OP_SERVICE_ACCOUNT_TOKEN invalid or expired` | Regenerate token in 1Password |
| `item not found:{name}` | Item doesn't exist in vault |
| `Polaris vault not found` | Service account lacks vault access |
