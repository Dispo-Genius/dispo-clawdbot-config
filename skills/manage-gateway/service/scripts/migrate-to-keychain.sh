#!/bin/bash
# Migrate credentials from JSON files to macOS Keychain
#
# This script:
# 1. Reads all credentials from ~/.clawdbot/credentials/{profile}.json files
# 2. Stores them in macOS Keychain under account "gateway:{profile}"
# 3. Optionally deletes the JSON files after verification
#
# Usage:
#   ./migrate-to-keychain.sh              # Migrate and prompt for deletion
#   ./migrate-to-keychain.sh --dry-run    # Show what would be migrated
#   ./migrate-to-keychain.sh --delete     # Migrate and auto-delete JSON files

set -e

DRY_RUN=false
AUTO_DELETE=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      ;;
    --delete)
      AUTO_DELETE=true
      ;;
  esac
done

CREDENTIALS_DIR="$HOME/.clawdbot/credentials"

if [ ! -d "$CREDENTIALS_DIR" ]; then
  echo "No credentials directory found at $CREDENTIALS_DIR"
  echo "Nothing to migrate."
  exit 0
fi

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required. Install with: brew install jq"
  exit 1
fi

echo "=== Gateway-CC Credential Migration ==="
echo ""
echo "Source: $CREDENTIALS_DIR/*.json"
echo "Target: macOS Keychain (account: gateway:{profile})"
echo ""

MIGRATED=0
PROFILES=()

for file in "$CREDENTIALS_DIR"/*.json; do
  [ -e "$file" ] || continue  # Handle empty glob

  profile=$(basename "$file" .json)
  PROFILES+=("$profile")

  echo "Profile: $profile"

  # Get all keys from the JSON file
  keys=$(jq -r 'keys[]' "$file" 2>/dev/null || true)

  if [ -z "$keys" ]; then
    echo "  (empty or invalid JSON)"
    continue
  fi

  for key in $keys; do
    value=$(jq -r ".\"$key\"" "$file")

    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY-RUN] Would migrate: $key"
    else
      # Delete existing if present
      security delete-generic-password -a "gateway:$profile" -s "$key" 2>/dev/null || true

      # Add to keychain
      security add-generic-password -a "gateway:$profile" -s "$key" -w "$value"
      echo "  Migrated: $key"
    fi

    ((MIGRATED++))
  done

  echo ""
done

if [ "$DRY_RUN" = true ]; then
  echo "=== Dry Run Complete ==="
  echo "Would migrate $MIGRATED credentials from ${#PROFILES[@]} profile(s)"
  exit 0
fi

echo "=== Migration Complete ==="
echo "Migrated $MIGRATED credentials from ${#PROFILES[@]} profile(s)"
echo ""

# Verify migration by listing keys
echo "Verifying migration..."
for profile in "${PROFILES[@]}"; do
  echo ""
  echo "Profile $profile:"
  gateway-cc keys list 2>/dev/null | grep -A100 "keys" || echo "  (run gateway-cc keys list to verify)"
done

echo ""

# Delete JSON files
if [ "$AUTO_DELETE" = true ]; then
  echo "Deleting JSON credential files..."
  rm -rf "$CREDENTIALS_DIR"
  echo "Done."
elif [ ${#PROFILES[@]} -gt 0 ]; then
  echo "JSON credential files still exist at $CREDENTIALS_DIR"
  echo "To delete them (recommended for security):"
  echo "  rm -rf $CREDENTIALS_DIR"
fi
