# Response Template

Standard format for customer support responses.

## Format

```
Hi [FirstName],

[Acknowledgment]

[Solution/Answer]

[Additional Resources - optional]

[Offer Further Help]

Best,
[Signature]
```

## Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `[FirstName]` | User profile name | "there" |
| `[Acknowledgment]` | Context from ticket | Generic acknowledgment |
| `[Solution]` | KB search or direct answer | - |
| `[Resources]` | KB article links | Omit section |
| `[Signature]` | Config or default | "Support Team" |

## Examples

### With KB Article

```
Hi Sarah,

Great question about exporting your data!

You can export from Settings > Data > Export. Choose your format (CSV or PDF) and the date range you need.

For more details, check out our guide: [Export Data Guide](link)

Let me know if you need anything else!

Best,
Support Team
```

### Without KB Article

```
Hi Marcus,

Thanks for reporting that issue with the dashboard loading slowly.

This usually happens when there's a lot of data to load. Try:
1. Refreshing the page
2. Clearing your browser cache
3. Using Chrome or Firefox if you're on another browser

If it's still slow after that, let me know and I'll look into your account specifically.

Best,
Support Team
```

### Escalation Acknowledgment

```
Hi Jordan,

I understand this has been frustrating - you deserve better than this.

I'm connecting you with a team member who can help resolve this directly. They'll be in touch within the hour.

Thank you for your patience.

Best,
Support Team
```
