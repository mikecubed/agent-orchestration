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
  *"npm test"*|*"npm run validate:plugin"*|*"npm run validate "*)
    ;;
  *)
    exit 0
    ;;
esac

# Determine repo root and state file (same logic as hook-verification.sh)
REPO_ROOT="$(git -C "${HOOK_WORKING_DIR:-.}" rev-parse --show-toplevel 2>/dev/null)" || exit 0
_REPO_HASH="$(echo "$REPO_ROOT" | sha256sum | cut -c1-12)"
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
