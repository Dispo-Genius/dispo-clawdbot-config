#!/bin/bash
# OpenClaw/Clawdbot Config Setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== OpenClaw Config Setup ==="
echo ""

# Check if this is for services symlink or full setup
if [[ "$1" == "--services-only" ]]; then
    echo "Symlinking services to ~/.claude/services/..."
    mkdir -p ~/.claude/services

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
    echo "Done! Services available at ~/.claude/services/"
    exit 0
fi

# Full OpenClaw setup
echo "This will set up OpenClaw configuration."
echo ""

# Check for ~/clawd directory
if [[ -d ~/clawd ]]; then
    echo "~/clawd already exists. Updating skills..."
else
    echo "Creating ~/clawd directory..."
    mkdir -p ~/clawd/skills
fi

# Copy skills to ~/clawd/skills/
echo "Copying OpenClaw skills..."
for skill in "$REPO_DIR/skills"/*; do
    if [[ -d "$skill" && "$(basename "$skill")" != ".gitkeep" ]]; then
        name=$(basename "$skill")
        cp -r "$skill" ~/clawd/skills/
        echo "  Copied: $name"
    fi
done

# Symlink services to ~/.claude/services/
echo ""
echo "Symlinking services to ~/.claude/services/..."
mkdir -p ~/.claude/services

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
echo "=== Setup Complete ==="
echo ""
echo "OpenClaw skills: ~/clawd/skills/"
echo "Services: ~/.claude/services/ (symlinked)"
echo ""
echo "Run 'clawdbot' to start the assistant."
