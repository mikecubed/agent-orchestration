#!/usr/bin/env bash
# hook-coverage-delta.sh — TEST-DELTA enforcement on Write|Edit tool calls.
# Fired as PostToolUse. Checks:
#   TEST-DELTA: New functions written without coverage report entry.
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

  # Skip test files themselves
  if _regex_matches '(^|/)__tests__(/|$)|\.(test|spec)\.[^/]+$|(^|/)[^/]+_(test|spec)\.[^/]+$' "$TOOL_FILE"; then
    exit 0
  fi

  _ts="$(date +%s)"
  _ext="${TOOL_FILE##*.}"
  _COV_ADVISORY="/tmp/codex-cov-advisory-${PROJECT_HASH}"
  _COV_JSON="/tmp/cov-${PROJECT_HASH}.json"

  # ── Locate coverage artifact ──────────────────────────────────────────────────
  _cov_file=""
  _cov_format=""

  case "$_ext" in
    ts | tsx | js | mjs | cjs | jsx)
      if [[ -f "coverage/lcov.info" ]]; then
        _cov_file="coverage/lcov.info"
        _cov_format="lcov"
      elif [[ -d "coverage" ]]; then
        _cov_file="coverage"
        _cov_format="dir"
      fi
      ;;
    py)
      if [[ -f ".coverage" ]]; then
        python3 -m coverage json -o "$_COV_JSON" -q 2>/dev/null || true
        if [[ -f "$_COV_JSON" ]]; then
          _cov_file="$_COV_JSON"
          _cov_format="coverage-json"
        fi
      elif [[ -f "$_COV_JSON" ]]; then
        _cov_file="$_COV_JSON"
        _cov_format="coverage-json"
      fi
      ;;
    go)
      if [[ -f "coverage.out" ]]; then
        _cov_file="coverage.out"
        _cov_format="go"
      fi
      ;;
    rs)
      if [[ -f "tarpaulin-report.json" ]]; then
        _cov_file="tarpaulin-report.json"
        _cov_format="tarpaulin"
      fi
      ;;
  esac

  # Generic fallback scan
  if [[ -z "$_cov_file" ]]; then
    for _try in "coverage/" "build/" "."; do
      if [[ -d "$_try" ]] && ls "$_try"*.info "$_try"*.json "$_try"*.xml 2>/dev/null | head -1 | grep -q .; then
        _cov_file="$_try"
        _cov_format="dir"
        break
      fi
    done
  fi

  # No artifact found — emit one-time advisory
  if [[ -z "$_cov_file" ]]; then
    if [[ ! -f "$_COV_ADVISORY" ]]; then
      touch "$_COV_ADVISORY" 2>/dev/null || true
      echo "ℹ️  TEST-DELTA (INFO): No coverage artifact found for this project. Run your test suite to generate one (e.g. 'npm test -- --coverage', 'pytest --cov', 'go test -coverprofile=coverage.out')."
    fi
    exit 0
  fi

  # ── Get newly added function names ────────────────────────────────────────────
  _new_fns="$(_new_symbols "$TOOL_FILE" 2>/dev/null || true)"

  if [[ -z "$_new_fns" ]]; then
    exit 0
  fi

  # ── Check each function against the coverage artifact ────────────────────────
  _fn_in_coverage() {
    local fn_name="$1"
    case "$_cov_format" in
      lcov)
        python3 -c "
import sys
fn_name = sys.argv[1]
with open('${_cov_file}', encoding='utf-8', errors='replace') as handle:
    for line in handle:
        if not line.startswith('FN:'):
            continue
        parts = line.rstrip('\n').split(',', 1)
        if len(parts) == 2 and parts[1] == fn_name:
            sys.exit(0)
sys.exit(1)
" "$fn_name" 2>/dev/null
        ;;
      coverage-json)
        python3 -c "
import sys, json
d = json.load(open('${_cov_file}'))
files = d.get('files', {})
for f_data in files.values():
    for fn in f_data.get('functions', {}).keys():
        if fn == sys.argv[1]:
            sys.exit(0)
sys.exit(1)
" "$fn_name" 2>/dev/null
        ;;
      go)
        grep -q "$fn_name" "$_cov_file" 2>/dev/null
        ;;
      tarpaulin)
        python3 -c "
import sys, json
data = json.load(open('${_cov_file}'))
content = json.dumps(data)
sys.exit(0 if sys.argv[1] in content else 1)
" "$fn_name" 2>/dev/null
        ;;
      dir)
        grep -rl "$fn_name" "$_cov_file" 2>/dev/null | grep -q .
        ;;
      *)
        return 0 # unknown format → assume covered, don't warn
        ;;
    esac
  }

  while IFS= read -r _fn; do
    [[ -z "$_fn" ]] && continue
    if ! _fn_in_coverage "$_fn"; then
      echo "⚠️  TEST-DELTA (WARN): New function '${_fn}' in '${TOOL_FILE}' is not in the coverage report. Run your test suite to verify coverage."
      _coverage_append "{\"rule\":\"TEST-DELTA\",\"severity\":\"WARN\",\"file\":\"${TOOL_FILE}\",\"line\":0,\"function\":\"${_fn}\",\"hook\":\"hook-coverage-delta\",\"ts\":${_ts}}"
    fi
  done <<<"$_new_fns"

  exit 0
) || exit 0 # fail-open
