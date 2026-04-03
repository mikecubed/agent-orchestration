#!/usr/bin/env bash
# hook-lib.sh — Shared normalisation library for clean-code-codex hooks.
# Source this file at the top of every hook script:
#   source "$(dirname "$0")/hook-lib.sh"
#
# After sourcing, the following variables are exported and ready to use:
#   TOOL_NAME        — Normalised tool name (e.g. "Write", "Edit", "Bash")
#   TOOL_FILE        — File path for Write/Edit tool calls (empty for Bash)
#   TOOL_CONTENT     — File content for Write/Edit tool calls
#   TOOL_COMMAND     — Command string for Bash tool calls
#   PROJECT_HASH     — 8-char md5 prefix of $PWD (stable per project)
#   COVERAGE_FILE    — Path to session coverage JSONL: /tmp/codex-hook-coverage-$PROJECT_HASH.jsonl
#   IS_EXCLUDED      — "1" if TOOL_FILE matches a generated/vendor path, else "0"
#   IS_TEST_FIXTURE  — "1" if TOOL_FILE is in a test fixture path, else "0"
#   IS_CLAUDE_CODE   — "1" if input uses Claude Code snake_case format, else "0"
#
# All logic is wrapped in a fail-open subshell guard — if lib sourcing fails,
# the hook exits 0 (allow) rather than blocking the agent.

set -euo pipefail

# ── 1. Read stdin JSON ────────────────────────────────────────────────────────
_HOOK_INPUT="$(cat)"

if [[ -z "$_HOOK_INPUT" ]]; then
  # No input — nothing to check, exit cleanly
  exit 0
fi

# ── 2. Detect input format ────────────────────────────────────────────────────
# Claude Code uses snake_case keys: tool_name, tool_input
# GH Copilot CLI uses camelCase keys: toolName, toolArgs
if echo "$_HOOK_INPUT" | grep -q '"tool_name"'; then
  export IS_CLAUDE_CODE="1"
  _RAW_TOOL_NAME="$(echo "$_HOOK_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")"
  _RAW_TOOL_INPUT="$(echo "$_HOOK_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('tool_input',{})))" 2>/dev/null || echo "{}")"
else
  export IS_CLAUDE_CODE="0"
  _RAW_TOOL_NAME="$(echo "$_HOOK_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('toolName',''))" 2>/dev/null || echo "")"
  # GH Copilot CLI passes toolArgs as an object
  _RAW_TOOL_INPUT="$(echo "$_HOOK_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('toolArgs',{})))" 2>/dev/null || echo "{}")"
fi

# ── 3. Export normalised TOOL_NAME ────────────────────────────────────────────
export TOOL_NAME="$_RAW_TOOL_NAME"

# ── 4. Extract tool-specific fields ──────────────────────────────────────────
if [[ "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "write" || "$TOOL_NAME" == "edit" ]]; then
  # Normalise to title-case
  export TOOL_NAME="${TOOL_NAME^}"

  TOOL_FILE="$(echo "$_RAW_TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# Claude Code Write: 'file_path'; Edit: 'file_path'
# GH Copilot CLI: 'path' or 'filePath'
print(d.get('file_path', d.get('path', d.get('filePath', ''))))" 2>/dev/null || echo "")"
  export TOOL_FILE

  TOOL_CONTENT="$(echo "$_RAW_TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# Claude Code Write: 'content'; Edit: 'new_content' or 'content'
# GH Copilot CLI: 'content'
print(d.get('content', d.get('new_content', d.get('newContent', ''))))" 2>/dev/null || echo "")"
  export TOOL_CONTENT

  export TOOL_COMMAND=""

elif [[ "$TOOL_NAME" == "Bash" || "$TOOL_NAME" == "bash" ]]; then
  export TOOL_NAME="Bash"
  export TOOL_FILE=""
  export TOOL_CONTENT=""

  TOOL_COMMAND="$(echo "$_RAW_TOOL_INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('command', d.get('cmd', '')))" 2>/dev/null || echo "")"
  export TOOL_COMMAND
else
  # Unknown tool — export empty vars and let calling script decide
  export TOOL_FILE=""
  export TOOL_CONTENT=""
  export TOOL_COMMAND=""
fi

# ── 5. Project hash and coverage file ────────────────────────────────────────
_portable_project_hash() {
  if command -v md5sum >/dev/null 2>&1; then
    printf '%s' "$PWD" | md5sum 2>/dev/null | cut -c1-8
    return 0
  fi

  if command -v md5 >/dev/null 2>&1; then
    printf '%s' "$PWD" | md5 -q 2>/dev/null | cut -c1-8
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$PWD" | shasum 2>/dev/null | cut -c1-8
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$PWD" | python3 -c "import hashlib, sys; print(hashlib.md5(sys.stdin.buffer.read()).hexdigest()[:8])" 2>/dev/null
    return 0
  fi

  echo "00000000"
}

_pcre_supported() {
  printf 'probe' | grep -qP 'probe' >/dev/null 2>&1
}

_regex_matches() {
  local pattern="$1"
  local text="$2"

  if _pcre_supported; then
    printf '%s' "$text" | grep -qP -- "$pattern" 2>/dev/null
    return $?
  fi

  python3 - "$pattern" <<'PYEOF' <<<"$text"
import re
import sys

pattern = sys.argv[1]
text = sys.stdin.read()
sys.exit(0 if re.search(pattern, text, re.MULTILINE) else 1)
PYEOF
}

_regex_first_match() {
  local pattern="$1"
  local text="$2"

  if _pcre_supported; then
    printf '%s' "$text" | grep -oP -- "$pattern" 2>/dev/null | head -1
    return 0
  fi

  python3 - "$pattern" <<'PYEOF' <<<"$text"
import re
import sys

pattern = sys.argv[1]
text = sys.stdin.read()
match = re.search(pattern, text, re.MULTILINE)
if match:
    print(match.group(0))
PYEOF
}

_regex_first_line() {
  local pattern="$1"
  local text="$2"

  if _pcre_supported; then
    printf '%s' "$text" | grep -nP -- "$pattern" 2>/dev/null | head -1 | cut -d: -f1
    return 0
  fi

  python3 - "$pattern" <<'PYEOF' <<<"$text"
import re
import sys

pattern = sys.argv[1]
text = sys.stdin.read()
match = re.search(pattern, text, re.MULTILINE)
if match:
    print(text[:match.start()].count('\n') + 1)
PYEOF
}

_regex_matching_lines() {
  local pattern="$1"
  local text="$2"

  if _pcre_supported; then
    printf '%s' "$text" | grep -nP -- "$pattern" 2>/dev/null || true
    return 0
  fi

  python3 - "$pattern" <<'PYEOF' <<<"$text"
import re
import sys

pattern = sys.argv[1]
for lineno, line in enumerate(sys.stdin.read().splitlines(), start=1):
    if re.search(pattern, line):
        print(f"{lineno}:{line}")
PYEOF
}

export PROJECT_HASH
PROJECT_HASH="$(_portable_project_hash)"

export COVERAGE_FILE="/tmp/codex-hook-coverage-${PROJECT_HASH}.jsonl"

# ── 6. Exclusion checks ───────────────────────────────────────────────────────
_PATTERNS_DIR="$(dirname "$0")/../patterns"

export IS_EXCLUDED="0"
export IS_TEST_FIXTURE="0"

if [[ -n "$TOOL_FILE" && -f "${_PATTERNS_DIR}/excluded-dirs.txt" ]]; then
  # Check for full exclusion (generated/vendor paths)
  while IFS= read -r pattern; do
    [[ -z "$pattern" || "$pattern" == \#* ]] && continue
    # Stop before fixture section marker
    [[ "$pattern" == "__fixtures__/"* || "$pattern" == "testdata/"* ||
      "$pattern" == "test/data/"* || "$pattern" == "spec/fixtures/"* ||
      "$pattern" == "fixtures/"* ]] && break
    if [[ "$TOOL_FILE" == *"$pattern"* ]]; then
      IS_EXCLUDED="1"
      break
    fi
  done <"${_PATTERNS_DIR}/excluded-dirs.txt"

  # Check for test fixture paths (downgrade block→warn, not skip)
  if [[ "$IS_EXCLUDED" == "0" ]]; then
    _fixture_patterns=("__fixtures__/" "testdata/" "test/data/" "spec/fixtures/" "fixtures/")
    for fp in "${_fixture_patterns[@]}"; do
      if [[ "$TOOL_FILE" == *"$fp"* ]]; then
        IS_TEST_FIXTURE="1"
        break
      fi
    done
  fi
fi

# ── 7. Helper: extract newly added function/symbol names from git diff ────────
# Usage: _new_symbols <file_path>
# Prints one function/symbol name per line (may be empty if no new symbols).
_new_symbols() {
  local file_path="$1"
  local ext="${file_path##*.}"

  # Get only added lines from the diff (strip the leading '+')
  local added_lines
  added_lines="$(git diff HEAD -- "$file_path" 2>/dev/null | grep '^+' | grep -v '^+++' | sed 's/^+//')"

  if [[ -z "$added_lines" ]]; then
    return 0
  fi

  case "$ext" in
    ts | tsx | js | mjs | cjs | jsx)
      echo "$added_lines" | grep -oP \
        '(?<=^|\s)(async\s+)?function\s+\K\w+|(?:^|\s)const\s+\K\w+(?=\s*=\s*(async\s*)?\()|\b(async\s+)?(?<![.$])\b[a-z]\w+(?=\s*\()' \
        2>/dev/null | sort -u || true
      ;;
    py)
      echo "$added_lines" | grep -oP \
        '(?:^|\s)(async\s+)?def\s+\K\w+' \
        2>/dev/null | sort -u || true
      ;;
    go)
      echo "$added_lines" | grep -oP \
        '(?:^|\s)func\s+\K\w+' \
        2>/dev/null | sort -u || true
      ;;
    rs)
      echo "$added_lines" | grep -oP \
        '(?:^|\s)(?:pub\s+)?fn\s+\K\w+' \
        2>/dev/null | sort -u || true
      ;;
  esac
}
export -f _new_symbols

# ── 8. Helper: append JSONL coverage record ───────────────────────────────────
# Usage: _coverage_append '{"rule":"SEC-1","file":"...","line":42}'
_coverage_append() {
  local record="$1"
  echo "$record" >>"$COVERAGE_FILE" 2>/dev/null || true
}
export -f _coverage_append

# ── 9. Helper: emit deny response for Claude Code ─────────────────────────────
# Usage: _deny_response "SEC-1" "Message text"
_deny_response() {
  local rule="$1"
  local message="$2"
  printf '{"permissionDecision":"deny","message":"%s: %s"}' \
    "$rule" "$(echo "$message" | sed 's/"/\\"/g')"
}
export -f _deny_response
