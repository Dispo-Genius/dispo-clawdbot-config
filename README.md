# OpenClaw Configuration

Skills and services for OpenClaw/Clawdbot AI assistant platform.

## Structure

```
dispo-clawdbot-config/
├── services/           # -cc tools (shared with Claude Code)
│   ├── github-cc/
│   ├── slack-cc/
│   └── ...
├── skills/             # OpenClaw skill wrappers
│   ├── agentmail/
│   ├── slack/
│   └── ...
└── scripts/
    └── setup.sh
```

## Services

Shared -cc tools that power both Claude Code and OpenClaw:

| Service | Purpose |
|---------|---------|
| agentmail-cc | AgentMail email integration |
| analyze-media-cc | Image/video analysis |
| browser-cc | Browser automation |
| diagram-cc | System diagrams |
| fathom-cc | Meeting notes |
| gateway-cc | Central auth gateway |
| github-cc | GitHub/Git operations |
| gmail-cc | Gmail integration |
| linear-cc | Linear issues |
| polaris-cc | Polaris AI |
| slack-cc | Slack messaging |
| spec-cc | Spec writing |
| stripe-cc | Stripe payments |
| vercel-cc | Vercel deployment |
| whisper-cc | Audio transcription |

## Skills

OpenClaw-specific skills that wrap the services:

| Skill | Purpose |
|-------|---------|
| agentmail | Email trigger handling |
| analyze-media | Visual analysis |
| diagram | Diagram management |
| fathom | Meeting notes |
| github | Git operations |
| linear | Issue tracking |
| polaris | AI analysis |
| slack | Messaging |
| spec | Spec writing |
| vercel | Deployments |

## Setup

```bash
git clone https://github.com/Dispo-Genius/dispo-clawdbot-config
cd dispo-clawdbot-config
./scripts/setup.sh
```

## Contributing

Use `/contribute` with `metadata.clawdbot: true` in your skill's frontmatter to route to this repo.
