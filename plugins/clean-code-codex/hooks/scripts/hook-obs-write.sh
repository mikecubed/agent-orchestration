#!/usr/bin/env bash
# hook-obs-write.sh — OBS-1 enforcement on Write|Edit tool calls.
# Fired as PostToolUse. Checks:
#   OBS-1: Empty or comment-only catch/except/error blocks (silent failures).
#
# Exit codes:
#   0 — always (findings surfaced as stdout warnings; post-write hooks don't block)

(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${_SCRIPT_DIR}/hook-lib.sh"

  # Only applies to Write and Edit
  if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
  fi

  # Skip excluded paths or empty file
  if [[ "$IS_EXCLUDED" == "1" || -z "$TOOL_FILE" ]]; then
    exit 0
  fi

  if [[ -z "$TOOL_CONTENT" ]]; then
    exit 0
  fi

  _ts="$(date +%s)"
  _ext="${TOOL_FILE##*.}"

  # Severity depends on whether this is a test fixture
  if [[ "$IS_TEST_FIXTURE" == "1" ]]; then
    _sev="INFO"
    _icon="ℹ️ "
  else
    _sev="WARN"
    _icon="⚠️ "
  fi

  # ── Write content to a temp file for grep -n ─────────────────────────────────
  _tmp_content="$(mktemp /tmp/codex-obs-XXXXXX)"
  echo "$TOOL_CONTENT" >"$_tmp_content"

  _emit_finding() {
    local lineno="$1"
    local msg="${_icon} OBS-1 (${_sev}): Empty catch block in '${TOOL_FILE}' line ${lineno}. Add logging, rethrow, or recovery logic."
    echo "$msg"
    _coverage_append "{\"rule\":\"OBS-1\",\"severity\":\"${_sev}\",\"file\":\"${TOOL_FILE}\",\"line\":${lineno},\"hook\":\"hook-obs-write\",\"ts\":${_ts}}"
  }

  # ── Language-specific pattern detection ───────────────────────────────────────
  case "$_ext" in
    ts | tsx | js | jsx | mjs | cjs)
      # Use Python for reliable multiline detection of empty/comment-only catch blocks
      while IFS= read -r _lineno; do
        [[ -z "$_lineno" || "$_lineno" == "0" ]] && continue
        _emit_finding "$_lineno"
      done < <(
        python3 - "$_tmp_content" 2>/dev/null <<'PYEOF'
import sys, re

content = open(sys.argv[1]).read()

seen = set()

def report(match):
    line = content[:match.start()].count('\n') + 1
    if line not in seen:
        seen.add(line)
        print(line)

# Single-line empty catch: catch(...) { }  — [^\S\n]* avoids matching across newlines
for m in re.finditer(r'catch\s*\([^)]*\)\s*\{[^\S\n]*\}', content):
    report(m)

# Multiline empty catch: catch(...) {\n  \n}
for m in re.finditer(r'catch\s*\([^)]*\)\s*\{\s*\n\s*\}', content):
    report(m)

# Comment-only single-line: catch(...) { // ... }
for m in re.finditer(r'catch\s*\([^)]*\)\s*\{[^\S\n]*//[^\n]*[^\S\n]*\}', content):
    report(m)

# Comment-only multiline: catch(...) {\n  // comment\n}
for m in re.finditer(r'catch\s*\([^)]*\)\s*\{\s*\n\s*//[^\n]*\n\s*\}', content):
    report(m)
PYEOF
      )

      # Comment-only catch body: catch(...) { // ... } (already covered above via Python)
      ;;

    py)
      # bare except: followed by pass (may be on next line — use multiline grep)
      # Match: "except:" or "except Exception:" followed by optional whitespace then "pass"
      while IFS=: read -r _lineno _; do
        [[ -z "$_lineno" ]] && continue
        _emit_finding "$_lineno"
      done < <(grep -nP '^\s*except\s*(\w[\w\s,()]*)?:\s*$' "$_tmp_content" 2>/dev/null | while IFS=: read -r ln _; do
        # Check if next non-blank line is "pass"
        _next="$(awk "NR>$ln && /[^[:space:]]/{print;exit}" "$_tmp_content" 2>/dev/null | sed 's/^[[:space:]]*//')"
        if [[ "$_next" == "pass" ]]; then
          echo "${ln}:"
        fi
      done || true)
      ;;

    go)
      # Empty nil-check error block: if err != nil { }
      while IFS=: read -r _lineno _; do
        [[ -z "$_lineno" ]] && continue
        _emit_finding "$_lineno"
      done < <(grep -nP 'if\s+\w+\s*!=\s*nil\s*\{\s*\}' "$_tmp_content" 2>/dev/null || true)
      ;;

    rs)
      # .unwrap() calls outside test blocks
      # Scan all .unwrap() lines; skip those inside #[cfg(test)] sections
      while IFS=: read -r _lineno _; do
        [[ -z "$_lineno" ]] && continue
        # Check if this line is within a #[cfg(test)] block by looking backwards
        _in_test_block="$(awk "NR<=$_lineno" "$_tmp_content" 2>/dev/null | grep -c '#\[cfg(test)\]' || echo 0)"
        if ((_in_test_block == 0)); then
          _emit_finding "$_lineno"
        fi
      done < <(grep -nP '\.unwrap\(\)' "$_tmp_content" 2>/dev/null || true)
      ;;
  esac

  rm -f "$_tmp_content" 2>/dev/null || true

  exit 0
) || exit 0 # fail-open
