#!/usr/bin/env bash
# hook-sec-write.sh — SEC-1 enforcement on Write|Edit tool calls.
# Fired as PreToolUse on Claude Code (can block) and GH Copilot CLI (warn only).
#
# Exit codes (Claude Code):
#   0 — allow (no findings, or fail-open on error)
#   2 — deny  (high-confidence secret found in Claude Code mode)
# Output:
#   Claude Code block: JSON {"permissionDecision":"deny","message":"..."} on stdout
#   GH Copilot CLI / WARN: plain-text message on stdout

# Fail-open wrapper: if anything in this script errors unexpectedly, allow the action.
(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=hook-lib.sh
  source "${_SCRIPT_DIR}/hook-lib.sh"

  # Only applies to Write and Edit
  if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
  fi

  # Skip fully excluded paths (generated/vendor)
  if [[ "$IS_EXCLUDED" == "1" ]]; then
    exit 0
  fi

  # Nothing to check if no content
  if [[ -z "$TOOL_CONTENT" ]]; then
    exit 0
  fi

  _PATTERNS_DIR="${_SCRIPT_DIR}/../patterns"
  _found_high=0
  _found_low=0
  _high_match=""
  _low_match=""

  # ── High-confidence patterns ──────────────────────────────────────────────────
  if [[ -f "${_PATTERNS_DIR}/secrets-high.txt" ]]; then
    while IFS= read -r pattern; do
      [[ -z "$pattern" || "$pattern" == \#* ]] && continue
      if _regex_matches "$pattern" "$TOOL_CONTENT"; then
        _found_high=1
        _high_match="$(_regex_first_match "$pattern" "$TOOL_CONTENT" | cut -c1-40)"
        break
      fi
    done <"${_PATTERNS_DIR}/secrets-high.txt"
  fi

  # ── Low-confidence patterns ───────────────────────────────────────────────────
  if [[ -f "${_PATTERNS_DIR}/secrets-low.txt" ]]; then
    while IFS= read -r pattern; do
      [[ -z "$pattern" || "$pattern" == \#* ]] && continue
      if _regex_matches "$pattern" "$TOOL_CONTENT"; then
        _found_low=1
        _low_match="$(_regex_first_match "$pattern" "$TOOL_CONTENT" | cut -c1-60)"
        break
      fi
    done <"${_PATTERNS_DIR}/secrets-low.txt"
  fi

  # ── Determine line number for coverage record ─────────────────────────────────
  _line_num=0
  if [[ $_found_high -eq 1 ]]; then
    # Find the first line number in TOOL_CONTENT that matches the high pattern
    while IFS= read -r pattern; do
      [[ -z "$pattern" || "$pattern" == \#* ]] && continue
      _ln="$(_regex_first_line "$pattern" "$TOOL_CONTENT")"
      if [[ -n "$_ln" ]]; then
        _line_num="$_ln"
        break
      fi
    done <"${_PATTERNS_DIR}/secrets-high.txt"
  fi

  # ── Emit findings ─────────────────────────────────────────────────────────────
  if [[ $_found_high -eq 1 ]]; then
    _sec1_msg="SEC-1 (BLOCK): Hardcoded secret detected in '${TOOL_FILE}' — matched pattern near: '${_high_match}...'. Remediation: (1) Move the value to an environment variable. (2) Add the variable name to .env.example. (3) Add .env to .gitignore. Do NOT write this file until the secret is removed."

    # Append coverage record
    _coverage_append "{\"rule\":\"SEC-1\",\"severity\":\"BLOCK\",\"file\":\"${TOOL_FILE}\",\"line\":${_line_num},\"hook\":\"hook-sec-write\",\"ts\":$(date +%s)}"

    if [[ "$IS_CLAUDE_CODE" == "1" && "$IS_TEST_FIXTURE" == "0" ]]; then
      # Pre-write block: deny the write
      printf '{"permissionDecision":"deny","message":"%s"}' \
        "$(echo "$_sec1_msg" | sed 's/"/\\"/g')"
      exit 2
    else
      # Post-write warn (GH Copilot CLI or test fixture)
      echo "⚠️  ${_sec1_msg}"
      exit 0
    fi
  fi

  if [[ $_found_low -eq 1 ]]; then
    _sec1_warn="SEC-1 (WARN): Possible hardcoded secret in '${TOOL_FILE}' — low-confidence match: '${_low_match}'. Verify this is not a real credential. If it is, move it to an environment variable."

    _coverage_append "{\"rule\":\"SEC-1\",\"severity\":\"WARN\",\"file\":\"${TOOL_FILE}\",\"line\":0,\"hook\":\"hook-sec-write\",\"ts\":$(date +%s)}"

    echo "⚠️  ${_sec1_warn}"
    exit 0
  fi

  exit 0
) || exit 0 # fail-open: unexpected error → allow
