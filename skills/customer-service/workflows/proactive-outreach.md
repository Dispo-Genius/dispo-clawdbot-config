# Proactive Outreach Workflow

Contact customers proactively for onboarding, check-ins, or announcements.

## When to Use

- "Reach out to new users"
- "Follow up with [customer]"
- "Send feature announcement"
- Onboarding check-in
- Satisfaction follow-up

## Outreach Types

### 1. New User Onboarding

**Trigger:** User signed up but hasn't completed key action

**Message:**
```
Hi [Name],

Welcome to Dispo Genius! I noticed you recently signed up.

Is there anything I can help you get started with? Happy to walk you through:
- Setting up your first [feature]
- Understanding [key concept]
- Any questions you have

Just reply here and I'll help!
```

### 2. Feature Announcement

**Trigger:** New feature released, relevant to user segment

**Message:**
```
Hi [Name],

Quick heads up - we just launched [Feature Name]!

[1-2 sentence benefit]

You can try it out here: [link]

Let me know if you have any questions!
```

### 3. Check-in / Satisfaction

**Trigger:** User completed major action, or periodic check-in

**Message:**
```
Hi [Name],

Just checking in - how's everything going with Dispo Genius?

Anything we can help improve or questions I can answer?

We're always looking to make things better!
```

### 4. Re-engagement

**Trigger:** User inactive for X days

**Message:**
```
Hi [Name],

I noticed it's been a while since you've used Dispo Genius.

Is there anything we can help with? We've added some new features that might interest you:
- [Feature 1]
- [Feature 2]

Just reply if you'd like a quick walkthrough!
```

## Process

### Step 1: Define Target Segment

Identify who to reach:
- New users (signed up last 7 days)
- Inactive users (no activity 30+ days)
- Feature users (using specific feature)
- All users (announcement)

### Step 2: Draft Message

Select appropriate template above and customize:
- Use customer's first name
- Reference their specific context if known
- Keep brief and actionable

### Step 3: User Approval

**Use AskUserQuestion:**
```
Outreach to [user/segment]:

"[full message]"

Options:
- Send as-is
- Edit message
- Skip this user
- Cancel outreach
```

### Step 4: Send Message

```bash
npx tsx ~/.claude/services/gleap-cc/src/index.ts create-outreach <userId> "<message>" --title "[Outreach type]"
```

### Step 5: Log Outreach

Track in internal notes or Linear for follow-up.

## Bulk Outreach

For multiple users, iterate:
1. Get user list from segment
2. For each user:
   - Customize message if needed
   - Confirm batch before sending
3. Send to all approved recipients

## Output

Confirm actions:
- "Sent onboarding check-in to [name]"
- "Outreach sent to [N] users in [segment]"
