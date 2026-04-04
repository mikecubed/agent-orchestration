#!/usr/bin/env bash
# hook-validation-record.sh — PostToolUse Bash
# Records when a validation command completes so that hook-verification.sh
# knows validation is current.  Writes the current epoch to the
# "${STATE_FILE}.validated" marker file.
#
# Always exits 0 — this hook never blocks.

# Read tool input from stdin (same convention as hook-lib.sh)
_HOOK_INPUT="$(cat 2>/dev/null)" || exit 0

if [[ -z "$_HOOK_INPUT" ]]; then
  exit 0
fi

# Extract command string from tool input JSON
TOOL_COMMAND="$(echo "$_HOOK_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', d.get('toolArgs', {}))
if isinstance(ti, str):
    ti = json.loads(ti)
print(ti.get('command', ti.get('cmd', '')))
" 2>/dev/null)" || exit 0

# Only act on validation commands
case "$TOOL_COMMAND" in
  # Matches: npm test, npm run validate, npm run validate:plugin,
  # npm run validate:runtime, etc. The hook is advisory/fail-open so
  # a slight over-match (e.g. npm run validate-schema) is acceptable.
  *"npm test"*|*"npm run validate"*)
    ;;
  *)
    exit 0
    ;;
esac

# Determine repo root and state file (same logic as hook-verification.sh)
REPO_ROOT="$(git -C "${HOOK_WORKING_DIR:-.}" rev-parse --show-toplevel 2>/dev/null)" || exit 0

# --- Helper: compute a portable repo hash ---
compute_repo_hash() {
  local input="$1"
  local hash=""

  if command -v sha256sum >/dev/null 2>&1; then
    hash="$(printf '%s' "$input" | sha256sum 2>/dev/null | awk '{print $1}')" || true
  elif command -v shasum >/dev/null 2>&1; then
    hash="$(printf '%s' "$input" | shasum -a 256 2>/dev/null | awk '{print $1}')" || true
  elif command -v python3 >/dev/null 2>&1; then
    hash="$(python3 -c "
import hashlib, sys
print(hashlib.sha256(sys.argv[1].encode('utf-8')).hexdigest())
" "$input" 2>/dev/null)" || true
  fi

  if [[ "$hash" =~ ^[0-9a-fA-F]{12,}$ ]]; then
    printf '%s\n' "${hash:0:12}"
    return 0
  fi

  return 1
}

_REPO_HASH="$(compute_repo_hash "$REPO_ROOT")" || {
  echo "[codex:validation-record] WARNING: Cannot compute repo hash; skipping." >&2
  exit 0
}
STATE_FILE="${TMPDIR:-/tmp}/codex-verify-${_REPO_HASH}.state"

# Check whether the validation command succeeded before recording.
# The hook framework (hook-lib.sh) does not expose exit codes for
# PostToolUse hooks, so we probe the JSON input for exit_code fields
# and fall back to error-pattern detection in tool output.
# TODO: Remove the error-pattern fallback once the hook framework
# exposes exit codes to PostToolUse hooks.
_CMD_OK="$(echo "$_HOOK_INPUT" | python3 -c "
import sys, json, re
d = json.load(sys.stdin)
# Try to find exit code in top-level or nested result objects
exit_code = None
for loc in [d, d.get('tool_result', {}), d.get('toolResult', {})]:
    if not isinstance(loc, dict):
        continue
    for key in ('exit_code', 'exitCode'):
        if key in loc:
            try:
                exit_code = int(loc[key])
            except (ValueError, TypeError):
                pass
            if exit_code is not None:
                break
    if exit_code is not None:
        break
if exit_code is not None:
    print('ok' if exit_code == 0 else 'fail')
    sys.exit(0)
# Exit code unavailable — fall back to error-pattern heuristic in output
output_parts = []
for key in ('tool_result', 'toolResult', 'output', 'stdout', 'stderr'):
    val = d.get(key)
    if isinstance(val, str):
        output_parts.append(val)
    elif isinstance(val, dict):
        for sk in ('output', 'stdout', 'stderr'):
            if isinstance(val.get(sk), str):
                output_parts.append(val[sk])
combined = '\n'.join(output_parts)
if combined and re.search(r'ERR!|FAIL|not ok|error:|panic:', combined, re.IGNORECASE):
    print('fail')
else:
    print('ok')
" 2>/dev/null)" || exit 0

if [[ "$_CMD_OK" != "ok" ]]; then
  exit 0
fi

# Record validation timestamp
date +%s > "${STATE_FILE}.validated" 2>/dev/null || true

exit 0
