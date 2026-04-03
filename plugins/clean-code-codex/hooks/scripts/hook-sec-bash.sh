#!/usr/bin/env bash
# hook-sec-bash.sh — SEC-7 enforcement on Bash tool calls.
# Blocks dangerous bash injection patterns on BOTH Claude Code and GH Copilot CLI.
# Applied as PreToolUse (Claude Code) and PreToolUse (GH Copilot CLI).
#
# Exit codes:
#   0 — allow
#   2 — deny / block (injection pattern found)

(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${_SCRIPT_DIR}/hook-lib.sh"

  # Only applies to Bash
  if [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
  fi

  if [[ -z "$TOOL_COMMAND" ]]; then
    exit 0
  fi

  _PATTERNS_DIR="${_SCRIPT_DIR}/../patterns"
  _found=0
  _match=""

  if [[ -f "${_PATTERNS_DIR}/bash-injection.txt" ]]; then
    while IFS= read -r pattern; do
      [[ -z "$pattern" || "$pattern" == \#* ]] && continue
      if echo "$TOOL_COMMAND" | grep -qP "$pattern" 2>/dev/null; then
        _found=1
        _match="$(echo "$TOOL_COMMAND" | grep -oP "$pattern" 2>/dev/null | head -1 | cut -c1-60)"
        break
      fi
    done <"${_PATTERNS_DIR}/bash-injection.txt"
  fi

  if [[ $_found -eq 1 ]]; then
    _sec7_msg="SEC-7 (BLOCK): Dangerous bash injection pattern detected — '${_match}'. Executing remote code or piping untrusted input to a shell interpreter is prohibited. Remediation: Download the resource first, inspect it, then execute explicitly. Never pipe a remote URL directly to sh/bash."

    _coverage_append "{\"rule\":\"SEC-7\",\"severity\":\"BLOCK\",\"file\":\"\",\"line\":0,\"command\":\"$(echo "$TOOL_COMMAND" | cut -c1-100 | sed 's/"/\\"/g')\",\"hook\":\"hook-sec-bash\",\"ts\":$(date +%s)}"

    # Block on both CLIs — bash injection is equally dangerous in any environment
    if [[ "$IS_CLAUDE_CODE" == "1" ]]; then
      printf '{"permissionDecision":"deny","message":"%s"}' \
        "$(echo "$_sec7_msg" | sed 's/"/\\"/g')"
      exit 2
    else
      echo "🚫 ${_sec7_msg}" >&2
      exit 2
    fi
  fi

  exit 0
) || exit 0 # fail-open
