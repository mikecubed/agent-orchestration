#!/usr/bin/env bash
# hook-quality.sh — SIZE-1 and DEAD-1 enforcement on Write|Edit tool calls.
# Fired as PostToolUse. Checks:
#   SIZE-1: function body line count (WARN ≥40, BLOCK ≥80)
#   DEAD-1: 3+ consecutive commented-out code lines
#
# Exit codes:
#   0 — always (findings are surfaced as stdout messages; post-write hooks don't block)

(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${_SCRIPT_DIR}/hook-lib.sh"

  # Only applies to Write and Edit
  if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
  fi

  # Skip excluded paths
  if [[ "$IS_EXCLUDED" == "1" ]]; then
    exit 0
  fi

  if [[ -z "$TOOL_CONTENT" ]]; then
    exit 0
  fi

  _ts="$(date +%s)"

  # ── SIZE-1: Function line count ───────────────────────────────────────────────
  # Use awk to find function declarations and count their body lines.
  # Supports: function foo(), def foo():, fn foo(, func foo(, foo: function(
  # Counts lines from opening brace/colon to matching close, excluding blank+comment-only lines.
  _size_findings="$(echo "$TOOL_CONTENT" | awk '
BEGIN {
  in_func = 0
  func_name = ""
  func_start = 0
  body_lines = 0
  brace_depth = 0
  indent_depth = -1
  lang = "brace"  # default to brace-based
}

# Detect Python-style functions (indentation-based)
/^[[:space:]]*(async[[:space:]]+)?def[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(/ {
  if (in_func && body_lines >= 40) {
    print func_name "|" func_start "|" body_lines
  }
  match($0, /def[[:space:]]+([A-Za-z_][A-Za-z0-9_]*)/, arr)
  func_name = arr[1]
  func_start = NR
  body_lines = 0
  in_func = 1
  lang = "python"
  # Capture base indentation
  match($0, /^([[:space:]]*)/, ind)
  indent_depth = length(ind[1])
  next
}

# Detect brace-based function declarations
/^[[:space:]]*(export[[:space:]]+)?(default[[:space:]]+)?(async[[:space:]]+)?(function[[:space:]]+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*[[:space:]]*[:=][[:space:]]*(async[[:space:]]+)?function|fn[[:space:]]+[A-Za-z_][A-Za-z0-9_]*|func[[:space:]]+[A-Za-z_][A-Za-z0-9_]*)[[:space:]]*\(/ {
  if (in_func && brace_depth == 0 && body_lines >= 40) {
    print func_name "|" func_start "|" body_lines
  }
  # Extract function name
  if (match($0, /(function|fn|func)[[:space:]]+([A-Za-z_][A-Za-z0-9_]*)/, arr)) {
    func_name = arr[2]
  } else if (match($0, /([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*[:=]/, arr)) {
    func_name = arr[1]
  } else {
    func_name = "anonymous"
  }
  func_start = NR
  body_lines = 0
  brace_depth = 0
  in_func = 1
  lang = "brace"
}

in_func == 1 {
  if (lang == "brace") {
    # Count braces to track function body boundary
    n = split($0, chars, "")
    for (i = 1; i <= n; i++) {
      if (chars[i] == "{") brace_depth++
      if (chars[i] == "}") {
        brace_depth--
        if (brace_depth == 0) {
          if (body_lines >= 40) print func_name "|" func_start "|" body_lines
          in_func = 0
          func_name = ""
          body_lines = 0
          next
        }
      }
    }
    # Count non-blank, non-comment-only lines
    stripped = $0
    gsub(/^[[:space:]]+/, "", stripped)
    if (stripped != "" && stripped !~ /^(\/\/|#|\/\*)/) {
      body_lines++
    }
  } else {
    # Python: track by indentation
    stripped = $0
    gsub(/^[[:space:]]+/, "", stripped)
    if (stripped == "") next  # blank line
    match($0, /^([[:space:]]*)/, ind)
    cur_indent = length(ind[1])
    if (cur_indent <= indent_depth && stripped !~ /^#/ && NR > func_start) {
      # Dedented back — function ended
      if (body_lines >= 40) print func_name "|" func_start "|" body_lines
      in_func = 0
      func_name = ""
      body_lines = 0
      next
    }
    if (stripped !~ /^#/) {
      body_lines++
    }
  }
}

END {
  if (in_func && body_lines >= 40) {
    print func_name "|" func_start "|" body_lines
  }
}
' 2>/dev/null || echo "")"

  if [[ -n "$_size_findings" ]]; then
    while IFS='|' read -r _fn_name _fn_line _fn_count; do
      [[ -z "$_fn_name" ]] && continue
      if ((_fn_count >= 80)); then
        _sev="BLOCK"
      else
        _sev="WARN"
      fi
      echo "⚠️  SIZE-1 (${_sev}): Function '${_fn_name}' is ${_fn_count} lines at ${TOOL_FILE}:${_fn_line}. Refactor: extract sub-functions with single responsibilities."
      _coverage_append "{\"rule\":\"SIZE-1\",\"severity\":\"${_sev}\",\"file\":\"${TOOL_FILE}\",\"line\":${_fn_line},\"function\":\"${_fn_name}\",\"hook\":\"hook-quality\",\"ts\":${_ts}}"
    done <<<"$_size_findings"
  fi

  # ── DEAD-1: Commented-out code detection ──────────────────────────────────────
  # Detect 3+ consecutive lines where each line (after stripping comment markers)
  # looks like real code: contains =, name(, control flow keywords, or closing brace.
  _dead_findings="$(echo "$TOOL_CONTENT" | awk '
function looks_like_code(line,    stripped) {
  stripped = line
  # Strip common comment markers
  gsub(/^[[:space:]]*(\/\/|#|\*|\/\*)/, "", stripped)
  gsub(/^[[:space:]]+/, "", stripped)
  if (stripped == "") return 0
  # Must contain a code-like token
  if (stripped ~ /[^=!<>]=[^=>]/) return 1   # assignment
  if (stripped ~ /[A-Za-z_][A-Za-z0-9_]*[[:space:]]*\(/) return 1  # function call
  if (stripped ~ /^(if |for |while |return |else |elif |switch |case )/) return 1
  if (stripped ~ /^\}/) return 1  # closing brace
  return 0
}

{
  line = $0
  # Check if this line is a comment
  stripped = $0
  gsub(/^[[:space:]]+/, "", stripped)
  is_comment = (stripped ~ /^(\/\/|#|\*|\/\*)/)

  if (is_comment && looks_like_code(line)) {
    consecutive++
    if (consecutive == 1) block_start = NR
    if (consecutive >= 3) {
      if (consecutive == 3) {
        print block_start "|" NR
      }
    }
  } else {
    consecutive = 0
  }
}
' 2>/dev/null || echo "")"

  if [[ -n "$_dead_findings" ]]; then
    while IFS='|' read -r _start_line _end_line; do
      [[ -z "$_start_line" ]] && continue
      echo "⚠️  DEAD-1 (BLOCK): Commented-out code block at ${TOOL_FILE}:${_start_line}-${_end_line}. Delete it — git history preserves it if needed."
      _coverage_append "{\"rule\":\"DEAD-1\",\"severity\":\"BLOCK\",\"file\":\"${TOOL_FILE}\",\"line\":${_start_line},\"end_line\":${_end_line},\"hook\":\"hook-quality\",\"ts\":${_ts}}"
    done <<<"$_dead_findings"
  fi

  exit 0
) || exit 0 # fail-open
