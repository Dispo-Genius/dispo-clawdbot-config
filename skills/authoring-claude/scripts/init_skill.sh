#!/bin/bash
# Initialize a new Claude Code skill with proper structure
# Usage: init_skill.sh <skill-name>

set -e

SKILL_NAME="$1"
SKILLS_DIR="${HOME}/.claude/skills"
SKILL_PATH="${SKILLS_DIR}/${SKILL_NAME}"

if [ -z "$SKILL_NAME" ]; then
    echo "Usage: init_skill.sh <skill-name>"
    echo "Example: init_skill.sh my-new-skill"
    exit 1
fi

# Validate skill name (kebab-case)
if [[ ! "$SKILL_NAME" =~ ^[a-z][a-z0-9-]*[a-z0-9]$ ]] && [[ ! "$SKILL_NAME" =~ ^[a-z]$ ]]; then
    echo "Error: Skill name must be kebab-case (e.g., 'my-skill-name')"
    exit 1
fi

if [ -d "$SKILL_PATH" ]; then
    echo "Error: Skill '${SKILL_NAME}' already exists at ${SKILL_PATH}"
    exit 1
fi

echo "Creating skill: ${SKILL_NAME}"

# Create directory structure
mkdir -p "${SKILL_PATH}"
mkdir -p "${SKILL_PATH}/references"
mkdir -p "${SKILL_PATH}/assets"

# Create SKILL.md with frontmatter
cat > "${SKILL_PATH}/SKILL.md" << 'SKILLEOF'
---
name: SKILL_NAME_PLACEHOLDER
# IMPORTANT: The description is the ONLY content Claude sees before triggering.
# Include all "when to use" context here - NOT in the body.
description: What this skill does. Triggers on "keyword1", "keyword2", "keyword3".
---

# Skill Title

Brief context (1-2 sentences max).

## Core Principles

Key concepts that guide execution (if applicable).

## Main Workflow

Primary content - what Claude needs to execute the skill.

## References

- [Reference Name](references/topic.md) - Description
SKILLEOF

# Replace placeholder with actual skill name
sed -i '' "s/SKILL_NAME_PLACEHOLDER/${SKILL_NAME}/" "${SKILL_PATH}/SKILL.md"

# Create placeholder reference
cat > "${SKILL_PATH}/references/.gitkeep" << EOF
# Add reference documentation here
EOF

# Create placeholder assets
cat > "${SKILL_PATH}/assets/.gitkeep" << EOF
# Add templates, icons, fonts here
EOF

echo "Created skill at: ${SKILL_PATH}"
echo ""
echo "Structure:"
echo "  ${SKILL_PATH}/"
echo "  ├── SKILL.md        # Main documentation"
echo "  ├── references/     # Deep-dive guides"
echo "  └── assets/         # Templates, starter files"
echo ""
echo "Next steps:"
echo "  1. Edit ${SKILL_PATH}/SKILL.md"
echo "  2. Update the description with trigger keywords"
echo "  3. Add references/ and assets/ as needed"
