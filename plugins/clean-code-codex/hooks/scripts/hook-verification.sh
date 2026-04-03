#!/usr/bin/env bash
# hook-verification.sh — PostToolUse Write/Edit
# Checks whether validation was run since the last code change.
# Exits non-zero with guidance if validation is overdue.
# Exits 0 silently if validation is current.
# Exits 0 with a warning if no validation config is found (non-blocking).

set -euo pipefail

REPO_ROOT="$(git -C "${HOOK_WORKING_DIR:-.}" rev-parse --show-toplevel 2>/dev/null || echo ".")"
STATE_FILE="${TMPDIR:-/tmp}/codex-verify-$(basename "$REPO_ROOT").state"
TIMESTAMP_FILE="${TMPDIR:-/tmp}/codex-verify-$(basename "$REPO_ROOT").ts"

# --- Helper: find validation commands ---
find_validation_commands() {
  local cmds=()

  # 1. Check .copilot/verify.yaml
  local verify_yaml="$REPO_ROOT/.copilot/verify.yaml"
  if [[ -f "$verify_yaml" ]]; then
    while IFS= read -r line; do
      cmds+=("$line")
    done < <(grep -v '^#' "$verify_yaml" | grep -v '^$' | head -5)
    echo "${cmds[@]}"
    return
  fi

  # 2. Check package.json for test/validate scripts
  local pkg="$REPO_ROOT/package.json"
  if [[ -f "$pkg" ]]; then
    if python3 -c "import json,sys; d=json.load(open('$pkg')); print('npm test')" 2>/dev/null; then
      return
    fi
  fi

  # 3. No config found
  echo ""
}

# --- Main ---
VALIDATION_CMDS="$(find_validation_commands)"

if [[ -z "$VALIDATION_CMDS" ]]; then
  echo "[codex:verification] WARNING: No validation commands configured. Add .copilot/verify.yaml or package.json test script to enable verification gate." >&2
  exit 0
fi

# Check if validation state file exists and is newer than any tracked file change
if [[ -f "$STATE_FILE" ]]; then
  LAST_VALIDATED="$(cat "$STATE_FILE")"
  LAST_CHANGED="$(git -C "$REPO_ROOT" log -1 --format="%ct" HEAD 2>/dev/null || echo "0")"

  if [[ "$LAST_VALIDATED" -ge "$LAST_CHANGED" ]]; then
    exit 0  # Validation is current — pass silently
  fi
fi

# Validation is overdue
echo "[codex:verification] BLOCK: Code was changed but validation has not been run since the last commit." >&2
echo "[codex:verification] Run the following before completing:" >&2
echo "  $VALIDATION_CMDS" >&2
echo "[codex:verification] After validation passes, re-run to clear this gate." >&2
exit 1
