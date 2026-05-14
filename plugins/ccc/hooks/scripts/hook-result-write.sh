#!/usr/bin/env bash
# hook-result-write.sh — RESULT-1 enforcement on Write|Edit tool calls.
# Fired as PostToolUse (WARN, non-blocking).
#
# Detects `throw`/`panic`/`raise` statements in core/ that look like domain
# failures. Heuristic — pattern-matching only.
#
# Severity calibration per result-check SKILL.md:
#   TS/Rust: BLOCK (handled at skill level; hook emits as WARN to give the
#     skill a chance to upgrade)
#   Python/JS/Go: WARN
# Hook emits WARN uniformly; the skill applies language-specific upgrade.
#
# Exit code: always 0 (post-write hook, never blocks).

(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${_SCRIPT_DIR}/hook-lib.sh"

  if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
  fi

  if [[ "$IS_EXCLUDED" == "1" || -z "$TOOL_FILE" || -z "$TOOL_CONTENT" ]]; then
    exit 0
  fi

  _ts="$(date +%s)"
  _LAYERMAP="/tmp/codex-layermap-${PROJECT_HASH}.json"

  if [[ ! -f "$_LAYERMAP" ]]; then
    exit 0
  fi

  _confidence="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('confidence','none'))" 2>/dev/null || echo none)"
  if [[ "$_confidence" == "none" ]]; then
    exit 0
  fi

  _core_dirs="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(' '.join(d.get('core_dirs',[])))" 2>/dev/null || echo "")"

  # Match root-level (`core/foo.ts`), nested, and trailing paths.
  _in_core=""
  for _d in $_core_dirs; do
    if [[ "$TOOL_FILE" == *"/${_d}/"* \
       || "$TOOL_FILE" == *"/${_d}" \
       || "$TOOL_FILE" == "${_d}/"* \
       || "$TOOL_FILE" == "${_d}" ]]; then
      _in_core="1"
      break
    fi
  done

  if [[ -z "$_in_core" ]]; then
    exit 0
  fi

  _ext="${TOOL_FILE##*.}"

  # Domain-failure-shaped throws: `throw new XError` / `raise XError` /
  # `panic!("...")` / `Err(...)` is fine (typed error return)
  _patterns=()
  case "$_ext" in
    ts|tsx|js|jsx|mjs|cjs)
      # Any PascalCase thrown class — catches OrderNotFound, InvalidAmount,
      # ChargeError, etc. The skill refines per language; the hook surfaces.
      _patterns=(
        'throw[[:space:]]+new[[:space:]]+[A-Z][a-zA-Z0-9_]*\('
        'throw[[:space:]]+new[[:space:]]+Error\(['"'"'"]'
      )
      ;;
    py)
      # Any PascalCase raised class — catches OrderNotFound, InvalidAmount,
      # ChargeError, ValidationFailed, etc.
      _patterns=(
        '^[[:space:]]*raise[[:space:]]+[A-Z][a-zA-Z0-9_]*\('
      )
      ;;
    go)
      _patterns=(
        '^[[:space:]]*panic\([^)]+\)'
      )
      ;;
    rs)
      _patterns=(
        '\bpanic!\('
        '\.unwrap\(\)'
        '\.expect\('
      )
      ;;
    *)
      exit 0
      ;;
  esac

  _findings=()
  for _pat in "${_patterns[@]}"; do
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      _findings+=("$line")
    done < <(_regex_matching_lines "$_pat" "$TOOL_CONTENT")
  done

  if ((${#_findings[@]} == 0)); then
    exit 0
  fi

  # Emit a single representative warning per file
  _first="${_findings[0]}"
  _lineno="$(echo "$_first" | cut -d: -f1)"
  _content="$(echo "$_first" | cut -d: -f2-)"
  _content_trimmed="$(echo "$_content" | sed 's/^[[:space:]]*//')"

  _coverage_append "{\"rule\":\"RESULT-1\",\"severity\":\"WARN\",\"file\":\"${TOOL_FILE}\",\"line\":${_lineno},\"hook\":\"hook-result-write\",\"ts\":${_ts}}"

  echo "⚠️  RESULT-1 (WARN): Possible domain failure thrown/raised in core '${TOOL_FILE}' line ${_lineno}: '${_content_trimmed}'. Consider Result<T, E> / typed error return instead."

  exit 0
) || exit 0
