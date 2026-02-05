#!/bin/bash
# Spawn a Claude Code session using cc worktree launcher
# Usage: spawn.sh "prompt" [--cwd /path]
#
# Examples:
#   spawn.sh "fix the bug" --cwd ~/my-project
#   spawn.sh "fix the bug"  # Uses CC_DEFAULT_PROJECT if set

PROMPT=""
CWD_ARG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --cwd)
      CWD_ARG="--cwd $2"
      shift 2
      ;;
    *)
      if [[ -z "$PROMPT" ]]; then
        PROMPT="$1"
      fi
      shift
      ;;
  esac
done

# Source cc function
source ~/.claude/scripts/cc.sh

# Use --cwd if specified, otherwise use CC_DEFAULT_PROJECT env var
if [[ -n "$CWD_ARG" ]]; then
  eval "cc $CWD_ARG \"$PROMPT\""
elif [[ -n "$CC_DEFAULT_PROJECT" ]]; then
  cc --cwd "$CC_DEFAULT_PROJECT" "$PROMPT"
else
  echo "Error: No --cwd specified and CC_DEFAULT_PROJECT not set"
  echo "Usage: spawn.sh \"prompt\" --cwd /path/to/repo"
  exit 1
fi
