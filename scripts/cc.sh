#!/bin/bash
# cc - Simple worktree launcher for Claude Code
# Creates isolated worktrees for parallel Claude sessions

CC_COUNTER_FILE="$HOME/.cc/counter"

_cc_reserve_id() {
  local max_attempts=50
  local attempt=0

  mkdir -p "$HOME/.cc/ids" 2>/dev/null

  # Start from current counter or 1
  local base_id=1
  if [[ -f "$CC_COUNTER_FILE" ]]; then
    base_id=$(cat "$CC_COUNTER_FILE" 2>/dev/null || echo 1)
  fi

  while [[ $attempt -lt $max_attempts ]]; do
    local candidate=$((base_id + attempt))
    local id_marker="$HOME/.cc/ids/$candidate"

    # Atomic operation: mkdir succeeds only if directory doesn't exist
    if mkdir "$id_marker" 2>/dev/null; then
      # Successfully claimed this ID
      echo "$candidate" > "$id_marker/claimed_at"
      echo "$candidate" > "$CC_COUNTER_FILE"  # Update counter for next process
      echo "$candidate"
      return 0
    fi

    # ID taken, try next
    ((attempt++))
  done

  echo "Error: Could not reserve session ID after $max_attempts attempts" >&2
  return 1
}

_cc_create_worktree_atomic() {
  local session_id="$1"
  local base_slug="$2"
  local worktrees_dir="$3"

  local slug="$base_slug"
  local counter=1
  local max_attempts=20

  while [[ $counter -le $max_attempts ]]; do
    local wt_path="$worktrees_dir/$slug"

    # Try to create branch atomically
    # Git will fail if branch exists, making this atomic
    if git worktree add "$wt_path" -b "$slug" origin/main >/dev/null 2>&1; then
      echo "$wt_path"
      return 0
    fi

    # Branch exists - check if it's a worktree collision or real branch
    if git show-ref --verify --quiet "refs/heads/$slug"; then
      # Real branch exists, try next slug
      slug="${base_slug}-${counter}"
      ((counter++))
    else
      # Worktree command failed for other reason - retry
      sleep 0.1
      if git worktree add "$wt_path" "$slug" >/dev/null 2>&1; then
        echo "$wt_path"
        return 0
      fi
      slug="${base_slug}-${counter}"
      ((counter++))
    fi
  done

  echo "Error: Could not create worktree after $max_attempts attempts" >&2
  return 1
}

_cc_write_session_metadata() {
  local session_id="$1"
  local wt_path="$2"
  local slug="$3"
  local prompt="$4"

  mkdir -p "$wt_path/.cc"

  # Write to temp file first, then atomic rename
  local temp_file="$wt_path/.cc/session.json.$$"
  cat > "$temp_file" << EOF
{
  "id": $session_id,
  "slug": "$slug",
  "title": "$slug",
  "description": "${prompt:-No description}",
  "initialPrompt": "${prompt:-}",
  "turnCount": 0,
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pid": $$,
  "hostname": "$(hostname)"
}
EOF

  # Atomic rename
  mv "$temp_file" "$wt_path/.cc/session.json"
}

_cc_cleanup_orphaned_ids() {
  # Clean up ID markers older than 1 hour with no corresponding worktree
  local ids_dir="$HOME/.cc/ids"
  [[ ! -d "$ids_dir" ]] && return

  find "$ids_dir" -type d -mmin +60 2>/dev/null | while read -r id_dir; do
    local id=$(basename "$id_dir")
    [[ "$id" == "ids" ]] && continue

    # Check if worktree exists
    local PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
    if [[ -n "$PROJECT_ROOT" ]]; then
      local WORKTREES_DIR="$PROJECT_ROOT/.cc/worktrees"
      local found=$(_cc_find_by_id "$id" "$WORKTREES_DIR" 2>/dev/null)
      if [[ -z "$found" ]]; then
        rm -rf "$id_dir" 2>/dev/null
      fi
    fi
  done
}

_cc_find_by_id() {
  local id="$1"
  local worktrees_dir="$2"

  for dir in "$worktrees_dir"/*; do
    [[ -d "$dir" ]] || continue
    local session_file="$dir/.cc/session.json"
    if [[ -f "$session_file" ]]; then
      local stored_id=$(jq -r '.id // 0' "$session_file" 2>/dev/null)
      if [[ "$stored_id" == "$id" ]]; then
        echo "$dir"
        return 0
      fi
    fi
  done
  return 1
}

_cc_get_worktree_status() {
  local wt_path="$1"
  local project_root="$2"
  local branch=$(basename "$wt_path")

  # Check if branch was merged to main (look for merge commits or PR references)
  if git -C "$project_root" log main --oneline --grep="$branch" -n 1 2>/dev/null | grep -q .; then
    echo "merged"
    return
  fi

  # Check if branch exists on remote
  if ! git -C "$project_root" ls-remote --heads origin "$branch" 2>/dev/null | grep -q .; then
    # Branch doesn't exist on remote - check if it was ever pushed
    if git -C "$project_root" branch -r 2>/dev/null | grep -q "origin/$branch"; then
      echo "merged"  # Was on remote but now gone = likely merged & deleted
    else
      echo "orphan"  # Never pushed or branch deleted
    fi
    return
  fi

  # Check for uncommitted changes
  if [[ -n $(git -C "$wt_path" status --porcelain 2>/dev/null) ]]; then
    echo "dirty"
    return
  fi

  echo "active"
}

_cc_prune_worktrees() {
  local project_root="$1"
  local worktrees_dir="$2"
  shift 2

  local force=false
  local all=false
  local current_wt=$(pwd)

  # Parse flags
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --force|-f) force=true ;;
      --all|-a) all=true ;;
    esac
    shift
  done

  # Colors
  local DIM='\033[2m'
  local BOLD='\033[1m'
  local RESET='\033[0m'
  local GREEN='\033[32m'
  local YELLOW='\033[33m'
  local RED='\033[31m'
  local CYAN='\033[36m'

  if [[ ! -d "$worktrees_dir" ]] || [[ -z "$(ls -A "$worktrees_dir" 2>/dev/null)" ]]; then
    printf "  ${DIM}No worktrees found${RESET}\n"
    return 0
  fi

  printf "  ${DIM}Scanning worktrees...${RESET}\n\n"

  local -a to_remove=()
  local -a statuses=()
  local -a slugs=()
  local has_dirty=false
  local skipped_current=false

  for dir in "$worktrees_dir"/*; do
    [[ -d "$dir" ]] || continue
    local slug=$(basename "$dir")
    local wt_status=$(_cc_get_worktree_status "$dir" "$project_root")

    # Skip current worktree
    if [[ "$dir" == "$current_wt" ]] || [[ "$current_wt" == "$dir"* ]]; then
      skipped_current=true
      continue
    fi

    slugs+=("$slug")
    statuses+=("$wt_status")

    case "$wt_status" in
      merged|orphan)
        to_remove+=("$dir")
        ;;
      dirty)
        [[ "$all" == true ]] && to_remove+=("$dir")
        has_dirty=true
        ;;
      active)
        [[ "$all" == true ]] && to_remove+=("$dir")
        ;;
    esac
  done

  # Display status for each worktree
  local idx=1
  for slug in "${slugs[@]}"; do
    local wt_status="${statuses[$idx]}"
    local will_remove=false

    for rm_dir in "${to_remove[@]}"; do
      [[ "$(basename "$rm_dir")" == "$slug" ]] && will_remove=true
    done

    case "$wt_status" in
      merged)
        printf "  ${GREEN}✓${RESET} ${GREEN}merged${RESET}  ${BOLD}%-16s${RESET}" "$slug"
        [[ "$will_remove" == false ]] && printf " ${DIM}← skipped${RESET}"
        printf "\n"
        ;;
      orphan)
        printf "  ${YELLOW}✗${RESET} ${YELLOW}orphan${RESET}  ${BOLD}%-16s${RESET}" "$slug"
        [[ "$will_remove" == false ]] && printf " ${DIM}← skipped${RESET}"
        printf "\n"
        ;;
      dirty)
        printf "  ${RED}!${RESET} ${RED}dirty${RESET}   ${BOLD}%-16s${RESET}" "$slug"
        if [[ "$all" != true ]]; then
          printf " ${DIM}← skipped (has changes)${RESET}"
        fi
        printf "\n"
        ;;
      active)
        printf "  ${DIM}·${RESET} ${DIM}active${RESET}  ${BOLD}%-16s${RESET}" "$slug"
        if [[ "$all" != true ]]; then
          printf " ${DIM}← skipped${RESET}"
        fi
        printf "\n"
        ;;
    esac
    ((idx++))
  done

  [[ "$skipped_current" == true ]] && printf "\n  ${DIM}(current worktree excluded)${RESET}\n"

  if [[ ${#to_remove[@]} -eq 0 ]]; then
    printf "\n  ${DIM}Nothing to prune${RESET}\n"
    git worktree prune 2>/dev/null
    return 0
  fi

  printf "\n"

  # Warning for dirty worktrees
  if [[ "$all" == true ]] && [[ "$has_dirty" == true ]]; then
    printf "  ${YELLOW}⚠${RESET}  ${YELLOW}Includes worktrees with uncommitted changes${RESET}\n\n"
  fi

  # Confirmation prompt (unless --force)
  if [[ "$force" != true ]]; then
    printf "  Remove ${BOLD}%d${RESET} worktree(s)? [y/N] " "${#to_remove[@]}"
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      printf "  ${DIM}Cancelled${RESET}\n"
      return 0
    fi
    printf "\n"
  fi

  # Remove worktrees
  local removed=0
  for dir in "${to_remove[@]}"; do
    local slug=$(basename "$dir")
    printf "  Removing ${BOLD}%s${RESET}..." "$slug"

    if git worktree remove --force "$dir" 2>/dev/null; then
      printf " ${GREEN}done${RESET}\n"
      ((removed++))
    else
      # Fallback: force remove directory and prune
      rm -rf "$dir" 2>/dev/null
      if [[ ! -d "$dir" ]]; then
        printf " ${GREEN}done${RESET}\n"
        ((removed++))
      else
        printf " ${RED}failed${RESET}\n"
      fi
    fi
  done

  # Clean up git worktree metadata
  git worktree prune 2>/dev/null

  printf "\n  ${GREEN}✓${RESET} Pruned ${BOLD}%d${RESET} worktree(s)\n" "$removed"
}

_cc_ensure_symlinks() {
  local instance="$HOME/.ccs/instances/$1"
  local global="$HOME/.claude"
  local shared="$HOME/.ccs/shared"

  [[ ! -d "$instance" ]] && return
  [[ ! -d "$shared" ]] && return

  # Directories that should be symlinked: instance → shared
  local dirs=(commands skills agents plugins tools services scripts hooks coordination)
  for dir in "${dirs[@]}"; do
    if [[ -d "$shared/$dir" ]]; then
      if [[ ! -e "$instance/$dir" && ! -L "$instance/$dir" ]]; then
        # Missing entirely — create symlink
        ln -s "$shared/$dir" "$instance/$dir" 2>/dev/null
      elif [[ -d "$instance/$dir" && ! -L "$instance/$dir" ]]; then
        # Real directory instead of symlink — replace it
        mv "$instance/$dir" "$instance/${dir}.replaced" 2>/dev/null
        ln -s "$shared/$dir" "$instance/$dir" 2>/dev/null
      fi
    fi
  done

  # Files that should be symlinked: instance → shared
  local files=(settings.json CLAUDE.md skill-rules.json manifest.yaml statusline.sh)
  for file in "${files[@]}"; do
    if [[ -e "$shared/$file" && ! -e "$instance/$file" && ! -L "$instance/$file" ]]; then
      ln -s "$shared/$file" "$instance/$file" 2>/dev/null
    fi
  done
}

_cc_get_account_metadata() {
  # Static account metadata for OAuth accounts (captured from initial login)
  local account="$1"
  case "$account" in
    account1)
      echo '{"accountUuid":"5c78bf4e-db99-4ecb-b43a-269d52239d65","emailAddress":"andyrongdg@gmail.com","organizationUuid":"c8c72f82-7385-45a0-8f93-33643e1e96b2","hasExtraUsageEnabled":false,"displayName":"Andres","organizationRole":"admin","workspaceRole":null,"organizationName":"andyrongdg@gmail.com'\''s Organization"}'
      ;;
    account2)
      echo '{"accountUuid":"15c77e3e-409c-47cd-8a9e-82b166326b6d","emailAddress":"andy@dispogenius.io","organizationUuid":"b1522e1f-051f-4bf5-a04b-c25fd4774c86","hasExtraUsageEnabled":true,"displayName":"Andy","organizationRole":"admin","workspaceRole":null,"organizationName":"andy@dispogenius.io'\''s Organization"}'
      ;;
    account3)
      echo '{"accountUuid":"c3a12491-6077-41b6-8f8e-b5ab3ee254db","emailAddress":"polaris@dispogenius.io","organizationUuid":"13c5a06b-4765-4fef-ae20-af92ec796fba","hasExtraUsageEnabled":false,"displayName":"Andrew","organizationRole":"admin","workspaceRole":null,"organizationName":"polaris@dispogenius.io'\''s Organization"}'
      ;;
    *)
      echo '{}'
      ;;
  esac
}

_cc_select_account() {
  # Auto-select optimal account using local keychain credentials
  local SELECTOR="$HOME/.claude/skills/account-selector/tool/src/index.ts"

  local response
  response=$(npx tsx "$SELECTOR" select 2>/dev/null)

  if [ $? -ne 0 ] || [ -z "$response" ]; then
    printf "  \033[33m●\033[0m \033[1maccount2\033[0m  \033[2m(selector failed)\033[0m\n" >&2
    echo "account2"
    return
  fi

  # Check for error response
  local error
  error=$(echo "$response" | jq -r '.error // empty')
  if [ -n "$error" ]; then
    printf "  \033[33m⚠\033[0m %s\n" "$error" >&2
    echo "account2"
    return
  fi

  # Parse response
  local account five_hour seven_day resets_5h resets_7d
  account=$(echo "$response" | jq -r '.account // empty')
  five_hour=$(echo "$response" | jq -r '.fiveHour.utilization // 0')
  seven_day=$(echo "$response" | jq -r '.sevenDay.utilization // 0')
  resets_5h=$(echo "$response" | jq -r '.fiveHour.resetsAt // empty')
  resets_7d=$(echo "$response" | jq -r '.sevenDay.resetsAt // empty')

  if [ -n "$account" ]; then
    # Calculate human-readable time until an ISO 8601 UTC reset timestamp
    _cc_reset_in() {
      local ts="$1"
      if [ -z "$ts" ] || [ "$ts" = "null" ]; then echo "-"; return; fi
      local reset_ts now_ts diff_mins
      reset_ts=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "${ts%%.*}" "+%s" 2>/dev/null || echo "0")
      now_ts=$(date "+%s")
      diff_mins=$(( (reset_ts - now_ts) / 60 ))
      if [ "$diff_mins" -le 0 ]; then
        echo "-"
      elif [ "$diff_mins" -lt 60 ]; then
        echo "${diff_mins}m"
      elif [ "$diff_mins" -lt 1440 ]; then
        echo "$(( diff_mins / 60 ))h"
      else
        echo "$(( diff_mins / 1440 ))d"
      fi
    }

    local resets_5h_in resets_7d_in
    resets_5h_in=$(_cc_reset_in "$resets_5h")
    resets_7d_in=$(_cc_reset_in "$resets_7d")

    printf "  \033[32m●\033[0m \033[1m%s\033[0m  5h:\033[36m%s%%\033[0m  7d:\033[36m%s%%\033[0m  resets \033[33m%s\033[0m\n" "$account" "$five_hour" "$seven_day" "5h:${resets_5h_in} 7d:${resets_7d_in}" >&2
    echo "$account"
  else
    echo "account2"
  fi
}

cc() {
  local PROFILE="${CCS_PROFILE:-$(_cc_select_account)}"

  # Periodic cleanup (runs in background, doesn't block)
  (_cc_cleanup_orphaned_ids &) 2>/dev/null

  # Ensure all shared symlinks exist for this account (auto-fix older setups)
  _cc_ensure_symlinks "$PROFILE"

  # Handle --help first (doesn't need git repo)
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "cc - Worktree launcher for Claude Code"
    echo ""
    echo "Usage:"
    echo "  cc                    Create worktree, run ccs"
    echo "  cc \"prompt\"           Create worktree with AI-named slug, run ccs with prompt"
    echo "  cc 55                 Resume session by ID (cc-55)"
    echo "  cc --list             List existing worktrees (run from project directory)"
    echo "  cc --resume <slug>    Resume existing worktree by slug"
    echo "  cc --sync             Rebase current worktree onto latest main"
    echo "  cc --prune            Remove merged/orphan worktrees (run from project directory)"
    echo "  cc --prune --all      Remove ALL worktrees (except current)"
    echo "  cc --prune --force    Skip confirmation prompt"
    echo ""
    echo "Environment:"
    echo "  CCS_PROFILE           Profile for ccs (auto-selected from gateway)"
    return 0
  fi

  # Find main repo root (not worktree root)
  local PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

  if [[ -z "$PROJECT_ROOT" ]]; then
    echo "Error: Not in a git repository"
    echo "cd into a project directory first, then run: cc $@"
    return 1
  fi

  # If we're inside a .cc/worktrees directory, extract the main repo path
  if [[ "$PROJECT_ROOT" == *"/.cc/worktrees/"* ]]; then
    PROJECT_ROOT="${PROJECT_ROOT%%/.cc/worktrees/*}"
  fi

  local WORKTREES_DIR="$PROJECT_ROOT/.cc/worktrees"

  case "$1" in
    --list|-l)
      if [[ ! -d "$WORKTREES_DIR" ]] || [[ -z "$(ls -A "$WORKTREES_DIR" 2>/dev/null)" ]]; then
        echo "No worktrees found"
        return 0
      fi
      echo "Worktrees in $PROJECT_ROOT:"
      echo ""
      for dir in "$WORKTREES_DIR"/*; do
        [[ -d "$dir" ]] || continue
        local slug=$(basename "$dir")
        local session_file="$dir/.cc/session.json"
        if [[ -f "$session_file" ]]; then
          local id=$(jq -r '.id // 0' "$session_file" 2>/dev/null)
          local title=$(jq -r '.title // .slug' "$session_file" 2>/dev/null)
          local desc=$(jq -r '.description // "No description"' "$session_file" 2>/dev/null | head -c 60)
          local turns=$(jq -r '.turnCount // 0' "$session_file" 2>/dev/null)
          printf "  \033[1;36mcc-%d\033[0m  \033[1m%s\033[0m  [%d turns]\n" "$id" "$slug" "$turns"
          printf "        %s\n" "$title"
          [[ "$desc" != "No description" ]] && printf "        \033[2m%s\033[0m\n" "$desc"
        else
          local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$dir" 2>/dev/null || echo "?")
          printf "  \033[1m%-20s\033[0m %s\n" "$slug" "$modified"
        fi
        echo ""
      done
      return 0
      ;;

    --resume|-r)
      local slug="$2"
      if [[ -z "$slug" ]]; then
        echo "Usage: cc --resume <slug>"
        echo "Available worktrees:"
        cc --list
        return 1
      fi
      local wt_path="$WORKTREES_DIR/$slug"
      if [[ ! -d "$wt_path" ]]; then
        echo "Worktree not found: $slug"
        cc --list
        return 1
      fi
      cd "$wt_path"
      git fetch origin main 2>/dev/null || true
      exec ccs "$PROFILE" --dangerously-skip-permissions
      ;;

    --prune|-p)
      shift
      _cc_prune_worktrees "$PROJECT_ROOT" "$WORKTREES_DIR" "$@"
      return $?
      ;;

    --sync|-s)
      # Colors
      local DIM='\033[2m'
      local BOLD='\033[1m'
      local RESET='\033[0m'
      local CYAN='\033[36m'
      local GREEN='\033[32m'
      local YELLOW='\033[33m'
      local RED='\033[31m'

      git fetch origin main 2>/dev/null || true
      local behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)

      if [[ "$behind" -eq 0 ]]; then
        printf "  ${GREEN}✓${RESET} Already up to date with main\n"
        return 0
      fi

      printf "  ${CYAN}↓${behind}${RESET} commits behind main\n"

      # Check for uncommitted changes
      local stashed=false
      if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
        printf "  ${YELLOW}⚠${RESET} Uncommitted changes — stashing first\n"
        git stash push -m "cc-sync: auto-stash before rebase" || return 1
        stashed=true
      fi

      if git rebase origin/main; then
        printf "  ${GREEN}✓${RESET} Rebased onto main\n"
        [[ "$stashed" == true ]] && git stash pop && printf "  ${GREEN}✓${RESET} Restored stashed changes\n"
      else
        printf "  ${RED}✗${RESET} Rebase conflict — aborting\n"
        git rebase --abort
        [[ "$stashed" == true ]] && git stash pop
        printf "  ${DIM}Run manually: git fetch origin main && git rebase origin/main${RESET}\n"
        return 1
      fi
      return 0
      ;;

    # Numeric ID - resume by ID
    [0-9]*)
      local id="$1"
      local wt_path=$(_cc_find_by_id "$id" "$WORKTREES_DIR")
      if [[ -z "$wt_path" ]]; then
        echo "Session cc-$id not found"
        cc --list
        return 1
      fi
      cd "$wt_path"
      git fetch origin main 2>/dev/null || true
      exec ccs "$PROFILE" --dangerously-skip-permissions
      ;;

    *)
      # Create new worktree
      local prompt="$1"
      local slug=""

      # Colors
      local DIM='\033[2m'
      local BOLD='\033[1m'
      local RESET='\033[0m'
      local CYAN='\033[36m'
      local GREEN='\033[32m'
      local WHITE='\033[97m'
      local RED='\033[31m'

      # Spinner
      local spin='⣾⣽⣻⢿⡿⣟⣯⣷'
      local spin_idx=0

      _spin() {
        printf "\r  ${CYAN}${spin:$spin_idx:1}${RESET} ${DIM}$1${RESET}" >&2
        spin_idx=$(( (spin_idx + 1) % 8 ))
      }
      _spin_done() {
        printf "\r\033[K" >&2
      }

      # Reserve ID atomically FIRST
      local session_id=$(_cc_reserve_id)
      if [[ $? -ne 0 || -z "$session_id" ]]; then
        echo "Error: Failed to reserve session ID"
        return 1
      fi

      mkdir -p "$WORKTREES_DIR"

      # Slug generation (sequential to avoid job noise)
      if [[ -n "$prompt" ]]; then
        _spin "naming"
        local schema='{"type":"object","properties":{"slug":{"type":"string","description":"1-2 word kebab-case slug"}},"required":["slug"]}'
        local result=$(echo "Generate a 1-2 word kebab-case slug for this task. Only output the JSON, nothing else: $prompt" | \
          claude --print --output-format json --model haiku --json-schema "$schema" 2>/dev/null)
        slug=$(echo "$result" | jq -r '.structured_output.slug // empty' 2>/dev/null | \
          tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
        _spin_done
      fi

      # Fetch
      _spin "syncing"
      git fetch origin main 2>/dev/null || true
      git worktree prune 2>/dev/null || true
      _spin_done

      [[ -z "$slug" ]] && slug="s${session_id}"

      # Create worktree atomically
      _spin "creating"
      local wt_path=$(_cc_create_worktree_atomic "$session_id" "$slug" "$WORKTREES_DIR")
      if [[ $? -ne 0 || -z "$wt_path" ]]; then
        _spin_done
        printf "  ${BOLD}${RED}✗${RESET} failed to create worktree\n"
        # Clean up reserved ID
        rm -rf "$HOME/.cc/ids/$session_id" 2>/dev/null
        return 1
      fi
      _spin_done

      cd "$wt_path"

      # Write session metadata atomically
      _cc_write_session_metadata "$session_id" "$wt_path" "$(basename "$wt_path")" "$prompt"

      local commit_hash=$(git rev-parse --short HEAD 2>/dev/null)

      # Minimal output
      printf "  ${BOLD}${WHITE}cc-${session_id}${RESET} ${GREEN}$(basename "$wt_path")${RESET} ${DIM}@ ${commit_hash}${RESET}\n\n"

      if [[ -n "$prompt" ]]; then
        exec ccs "$PROFILE" --dangerously-skip-permissions "$prompt"
      else
        exec ccs "$PROFILE" --dangerously-skip-permissions
      fi
      ;;
  esac
}
