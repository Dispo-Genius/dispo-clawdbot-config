#!/bin/bash
# OpenClaw Setup
# One command: curl -sL https://raw.githubusercontent.com/Dispo-Genius/dispo-clawdbot-config/main/scripts/setup.sh | bash

set -e

REPO_URL="https://github.com/Dispo-Genius/dispo-clawdbot-config.git"
REPO_DIR="$HOME/dispo-clawdbot-config"
CLAUDE_CONFIG_URL="https://github.com/Dispo-Genius/dispo-claude-config.git"
CLAUDE_CONFIG_DIR="$HOME/dispo-claude-config"

echo "=== OpenClaw Setup ==="
echo ""

# Clone or update repo
if [[ -d "$REPO_DIR" ]]; then
  echo "Updating existing repo..."
  (cd "$REPO_DIR" && git pull --quiet)
else
  echo "Cloning dispo-clawdbot-config..."
  git clone --quiet "$REPO_URL" "$REPO_DIR"
fi

# gateway-cc lives in claude-config (source of truth)
if [[ -d "$CLAUDE_CONFIG_DIR" ]]; then
  echo "Updating claude-config..."
  (cd "$CLAUDE_CONFIG_DIR" && git pull --quiet)
else
  echo "Cloning dispo-claude-config (for gateway-cc)..."
  git clone --quiet "$CLAUDE_CONFIG_URL" "$CLAUDE_CONFIG_DIR"
fi

echo ""

# Services-only mode
if [[ "$1" == "--services-only" ]]; then
    echo "Symlinking services to ~/.claude/services/..."
    mkdir -p ~/.claude/services

    # Link gateway-cc from claude-config (source of truth)
    if [[ ! -e ~/.claude/services/gateway-cc ]]; then
        ln -s "$CLAUDE_CONFIG_DIR/.claude/services/gateway-cc" ~/.claude/services/gateway-cc
        echo "  Linked: gateway-cc (from claude-config)"
    else
        echo "  Exists: gateway-cc (skipped)"
    fi

    for service in "$REPO_DIR/services"/*; do
        if [[ -d "$service" && "$(basename "$service")" != ".gitkeep" ]]; then
            name=$(basename "$service")
            if [[ ! -e ~/.claude/services/$name ]]; then
                ln -s "$service" ~/.claude/services/$name
                echo "  Linked: $name"
            else
                echo "  Exists: $name (skipped)"
            fi
        fi
    done

    echo ""
    echo "Done! Services at ~/.claude/services/"
    exit 0
fi

# Full setup
echo "Setting up OpenClaw..."

# Create ~/clawd
mkdir -p ~/clawd/skills

# Copy skills
echo "Copying skills to ~/clawd/skills/..."
for skill in "$REPO_DIR/skills"/*; do
    if [[ -d "$skill" && "$(basename "$skill")" != ".gitkeep" ]]; then
        name=$(basename "$skill")
        cp -r "$skill" ~/clawd/skills/
        echo "  $name"
    fi
done

# Symlink services
echo ""
echo "Symlinking services to ~/.claude/services/..."
mkdir -p ~/.claude/services

# Link gateway-cc from claude-config (source of truth)
if [[ ! -e ~/.claude/services/gateway-cc ]]; then
    ln -s "$CLAUDE_CONFIG_DIR/.claude/services/gateway-cc" ~/.claude/services/gateway-cc
    echo "  gateway-cc (from claude-config)"
fi

for service in "$REPO_DIR/services"/*; do
    if [[ -d "$service" && "$(basename "$service")" != ".gitkeep" ]]; then
        name=$(basename "$service")
        if [[ ! -e ~/.claude/services/$name ]]; then
            ln -s "$service" ~/.claude/services/$name
            echo "  $name"
        fi
    fi
done

# Install service dependencies
echo ""
echo "Installing dependencies..."

# Install gateway-cc dependencies (from claude-config)
if [[ -f "$CLAUDE_CONFIG_DIR/.claude/services/gateway-cc/package.json" ]]; then
    (cd "$CLAUDE_CONFIG_DIR/.claude/services/gateway-cc" && npm install --silent 2>/dev/null) && echo "  gateway-cc"
fi

for service in "$REPO_DIR/services"/*; do
    if [[ -f "$service/package.json" ]]; then
        name=$(basename "$service")
        (cd "$service" && npm install --silent 2>/dev/null) && echo "  $name"
    fi
done

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Product:  OpenClaw"
echo "Skills:   ~/clawd/skills/"
echo "Services: ~/.claude/services/"
echo "Repo:     ~/dispo-clawdbot-config"
echo ""
echo "To update: cd ~/dispo-clawdbot-config && git pull && ./scripts/setup.sh"
