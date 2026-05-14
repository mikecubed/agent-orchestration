#!/usr/bin/env bash
# hook-immut-write.sh — IMMUT-1 enforcement on Write|Edit tool calls.
# Fired as PostToolUse (WARN, non-blocking).
#
# Detects mutation patterns inside core/ that operate on function parameters.
# This is intentionally heuristic — pattern-matching only, no full AST parse.
# Misses are acceptable; false positives are downgraded by WARN severity.
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

  # Per-language in-place mutation patterns. These match the *method call*,
  # not the parameter binding — humans verify at WARN level.
  _patterns=()
  case "$_ext" in
    ts|tsx|js|jsx|mjs|cjs)
      _patterns=(
        '\.push\('
        '\.unshift\('
        '\.splice\('
        '\.shift\('
        '\.pop\('
        '\.fill\('
        '\.copyWithin\('
        'Object\.assign\([a-zA-Z_$][a-zA-Z0-9_$]*,'
      )
      ;;
    py)
      _patterns=(
        '\.append\('
        '\.extend\('
        '\.insert\('
        '\.pop\('
        '\.remove\('
        '\.update\([a-zA-Z_]'
        '\.setdefault\('
      )
      ;;
    go)
      # In Go, flag the patterns the IMMUT-1 Go reference calls out:
      #   * sort.Slice / sort.SliceStable on a parameter slice
      #   * explicit slice index writes:   items[i] = x
      #   * map index writes:              m[k] = v
      #   * map deletions:                 delete(m, k)
      # WARN severity — patterns are heuristic; humans verify the receiver
      # is actually a parameter (vs. a locally-constructed slice/map).
      _patterns=(
        'sort\.Slice\('
        'sort\.SliceStable\('
        # `<ident>[<key>] = …` — slice/map index assignment. Single-equal,
        # not `==`/`!=`. Matches `items[i] = x`, `m[k] = v`, `o.items[0] = x`.
        '^[[:space:]]*[A-Za-z_][A-Za-z0-9_.]*\[[^]]+\][[:space:]]*=[^=]'
        # `delete(m, k)` — built-in map deletion. Always mutates the map.
        '\bdelete\([A-Za-z_]'
      )
      ;;
    rs)
      # Rust's borrow checker handles most cases; flag explicit mut method calls
      # on &mut self where the receiver is likely a parameter.
      _patterns=(
        '\.push\('
        '\.insert\('
        '\.remove\('
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

  # Emit at most one warning per file per hook run to avoid noise
  _first="${_findings[0]}"
  _lineno="$(echo "$_first" | cut -d: -f1)"
  _content="$(echo "$_first" | cut -d: -f2-)"
  _content_trimmed="$(echo "$_content" | sed 's/^[[:space:]]*//')"

  _coverage_append "{\"rule\":\"IMMUT-1\",\"severity\":\"WARN\",\"file\":\"${TOOL_FILE}\",\"line\":${_lineno},\"hook\":\"hook-immut-write\",\"ts\":${_ts}}"

  echo "⚠️  IMMUT-1 (WARN): Mutation pattern in core file '${TOOL_FILE}' line ${_lineno}: '${_content_trimmed}'. If '${_content_trimmed}' mutates a parameter, return a new value instead."

  exit 0
) || exit 0
