#!/usr/bin/env bash
# hook-verification.sh — PostToolUse Write/Edit
# Checks whether validation was run since the last code change.
# Exits non-zero with guidance if validation is overdue.
# Exits 0 silently if validation is current.
# Exits 0 with a warning on infrastructure failures (fail-open).
#
# Companion: hook-validation-record.sh writes ${STATE_FILE}.validated
# after a successful validation run to clear this gate.

# No top-level `set -euo pipefail` — this hook is fail-open by design.
# Only the "validation overdue" path exits non-zero; all infrastructure
# failures (missing git, unwritable TMPDIR, python3 errors) exit 0.

REPO_ROOT="$(git -C "${HOOK_WORKING_DIR:-.}" rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[codex:verification] WARNING: Cannot determine repo root; skipping gate." >&2
  exit 0
}

_REPO_HASH="$(echo "$REPO_ROOT" | sha256sum | cut -c1-12)"
STATE_FILE="${TMPDIR:-/tmp}/codex-verify-${_REPO_HASH}.state"

# --- Helper: find validation commands ---
find_validation_commands() {
  # 1. Check .copilot/verify.yaml
  local verify_yaml="$REPO_ROOT/.copilot/verify.yaml"
  if [[ -f "$verify_yaml" ]]; then
    local cmds=()
    while IFS= read -r line; do
      cmds+=("$line")
    done < <(grep -v '^#' "$verify_yaml" | grep -v '^$' | head -5)
    if [[ ${#cmds[@]} -gt 0 ]]; then
      printf '%s\n' "${cmds[@]}"
    fi
    return
  fi

  # 2. Check package.json for test/validate scripts
  local pkg="$REPO_ROOT/package.json"
  if [[ -f "$pkg" ]]; then
    local result
    result="$(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
scripts = d.get('scripts', {})
cmds = []
if 'test' in scripts:
    cmds.append('npm test')
if 'validate:plugin' in scripts:
    cmds.append('npm run validate:plugin')
if cmds:
    print('\n'.join(cmds))
" "$pkg" 2>/dev/null)" || true
    if [[ -n "$result" ]]; then
      echo "$result"
      return
    fi
  fi

  # 3. No config found
  echo ""
}

# --- Main ---
VALIDATION_CMDS="$(find_validation_commands)" || true

if [[ -z "$VALIDATION_CMDS" ]]; then
  echo "[codex:verification] WARNING: No validation commands configured. Add .copilot/verify.yaml or package.json test script to enable verification gate." >&2
  exit 0
fi

# Read previous change time BEFORE updating it
PREV_CHANGED="$(cat "${STATE_FILE}.changed" 2>/dev/null || echo "0")"

# Record that a code change happened (fail-open on write failure)
date +%s > "${STATE_FILE}.changed" 2>/dev/null || {
  echo "[codex:verification] WARNING: Cannot write state file; skipping gate." >&2
  exit 0
}

# Check if validation is current relative to the PREVIOUS change
LAST_VALIDATED="$(cat "${STATE_FILE}.validated" 2>/dev/null || echo "0")"

if [[ "$LAST_VALIDATED" =~ ^[0-9]+$ ]] && [[ "$PREV_CHANGED" =~ ^[0-9]+$ ]]; then
  if (( LAST_VALIDATED >= PREV_CHANGED )); then
    exit 0  # Validation is current relative to the last change before this one
  fi
fi

# Validation is overdue
echo "[codex:verification] BLOCK: Code was changed but validation has not been run since the last change." >&2
echo "[codex:verification] Run the following before completing:" >&2
echo "$VALIDATION_CMDS" | sed 's/^/  /' >&2
echo "[codex:verification] After validation passes, re-run to clear this gate." >&2
exit 1
