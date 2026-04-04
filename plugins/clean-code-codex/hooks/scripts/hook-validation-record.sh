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

is_validation_command() {
  local tool_command="$1"
  local repo_root="$2"

  python3 - "$tool_command" "$repo_root" <<'PY'
import json
import pathlib
import re
import sys

command = sys.argv[1]
repo_root = pathlib.Path(sys.argv[2])


def normalize(value):
    return " ".join(str(value).strip().split())


def shell_matches(executed, candidate):
    executed = normalize(executed)
    candidate = normalize(candidate)
    if not executed or not candidate:
        return False
    return (
        executed == candidate
        or executed.endswith(" && " + candidate)
        or executed.endswith("; " + candidate)
        or ("\n" + candidate) in ("\n" + executed)
        or candidate in executed
    )


normalized_command = normalize(command)
if not normalized_command:
    sys.exit(1)

# Preserve the existing built-in behavior.
if "npm test" in normalized_command or "npm run validate" in normalized_command:
    sys.exit(0)

candidates = set()

# Derive validation commands from package.json scripts across common package managers.
package_json = repo_root / "package.json"
if package_json.is_file():
    try:
        package_data = json.loads(package_json.read_text(encoding="utf-8"))
        scripts = package_data.get("scripts", {})
        if isinstance(scripts, dict):
            script_names = [
                name for name in scripts
                if name == "test" or str(name).startswith("validate")
            ]
            for name in script_names:
                candidates.add(f"npm run {name}")
                candidates.add(f"pnpm run {name}")
                candidates.add(f"yarn run {name}")
                candidates.add(f"bun run {name}")
                if name == "test":
                    candidates.add("npm test")
                    candidates.add("pnpm test")
                    candidates.add("yarn test")
                    candidates.add("bun test")
                elif name.startswith("validate"):
                    candidates.add(f"yarn {name}")
    except Exception:
        pass

# Heuristically extract configured validation commands from .copilot/verify.yaml
verify_yaml = repo_root / ".copilot" / "verify.yaml"
if verify_yaml.is_file():
    try:
        lines = verify_yaml.read_text(encoding="utf-8").splitlines()
        section_stack = []
        section_indents = []

        def strip_comment(text):
            escaped = False
            quote = None
            for index, char in enumerate(text):
                if escaped:
                    escaped = False
                    continue
                if char == "\\":
                    escaped = True
                    continue
                if quote:
                    if char == quote:
                        quote = None
                    continue
                if char in ("'", '"'):
                    quote = char
                    continue
                if char == "#":
                    return text[:index]
            return text

        for raw_line in lines:
            line = strip_comment(raw_line).rstrip()
            if not line.strip():
                continue

            indent = len(line) - len(line.lstrip(" "))
            while section_indents and indent <= section_indents[-1]:
                section_indents.pop()
                section_stack.pop()

            stripped = line.strip()
            key_match = re.match(r"([A-Za-z0-9_.-]+)\s*:\s*(.*)$", stripped)
            if key_match:
                key, value = key_match.groups()
                lower_key = key.lower()
                if value.strip():
                    cleaned = value.strip().strip("'\"")
                    if lower_key in {"command", "cmd", "run"}:
                        candidates.add(cleaned)
                    elif lower_key in {"validation", "validation_command"}:
                        candidates.add(cleaned)
                else:
                    section_stack.append(lower_key)
                    section_indents.append(indent)
                continue

            list_match = re.match(r"-\s+(.*)$", stripped)
            if list_match:
                item = list_match.group(1).strip().strip("'\"")
                if section_stack and section_stack[-1] in {
                    "validation_commands",
                    "commands",
                    "validate",
                    "validation",
                }:
                    candidates.add(item)
    except Exception:
        pass

for candidate in candidates:
    if shell_matches(normalized_command, candidate):
        sys.exit(0)

sys.exit(1)
PY
}

# Only act on validation commands
if ! is_validation_command "$TOOL_COMMAND" "$REPO_ROOT"; then
  exit 0
fi

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
