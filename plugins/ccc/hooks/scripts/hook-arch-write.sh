#!/usr/bin/env bash
# hook-arch-write.sh — BOUND-1 enforcement on Write|Edit tool calls.
# Fired as PreToolUse. Checks:
#   BOUND-1: Core layer must not import shell / infrastructure code.
#
# Layer detection follows the conductor's Section 14:
#   1. Prefer `core/` + `shell/` directories anywhere in the tree.
#   2. Fall back to legacy paths: domain/entities/models → core;
#      application/services/infra/adapters/db/api/controllers/handlers → shell.
#
# Exit codes:
#   0 — allow
#   2 — deny (Claude Code only, with JSON body on stdout)

_EXIT_CODE_FILE="$(mktemp /tmp/codex-bound-exit-XXXXXX 2>/dev/null || echo /tmp/codex-bound-exit-$$)"
echo "0" >"$_EXIT_CODE_FILE"

(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${_SCRIPT_DIR}/hook-lib.sh"

  if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
  fi

  if [[ "$IS_EXCLUDED" == "1" || -z "$TOOL_FILE" ]]; then
    exit 0
  fi

  _ts="$(date +%s)"
  _LAYERMAP="/tmp/codex-layermap-${PROJECT_HASH}.json"
  _TTL=300

  _core_dirs=""
  _shell_dirs=""
  _confidence=""

  _load_map() {
    local gen_at ttl_sec now
    gen_at="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('generated_at',0))" 2>/dev/null || echo 0)"
    ttl_sec="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('ttl_seconds',${_TTL}))" 2>/dev/null || echo 0)"
    now="$(date +%s)"
    if ((gen_at + ttl_sec > now)); then
      _confidence="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('confidence','none'))" 2>/dev/null || echo none)"
      _core_dirs="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(' '.join(d.get('core_dirs',[])))" 2>/dev/null || echo "")"
      _shell_dirs="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(' '.join(d.get('shell_dirs',[])))" 2>/dev/null || echo "")"
      return 0
    fi
    return 1
  }

  _generate_map() {
    local found_core=() found_shell=()
    local match_count=0

    # Prefer functional-core convention: core/ + shell/ anywhere in the tree
    if find . -type d \( -name core -o -name shell \) -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | grep -q .; then
      while IFS= read -r d; do
        found_core+=("core")
        break
      done < <(find . -type d -name core -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null)
      while IFS= read -r d; do
        found_shell+=("shell")
        break
      done < <(find . -type d -name shell -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null)
      ((match_count = ${#found_core[@]} + ${#found_shell[@]}))
    fi

    # Legacy fallback: domain/entities/models → core; application/services/infra/adapters/db/api/controllers/handlers → shell
    if ((match_count == 0)); then
      for d in domain entities models; do
        if find . -type d -name "$d" -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | grep -q .; then
          found_core+=("$d")
          ((match_count++)) || true
        fi
      done
      for d in application app usecases use-cases use_cases services infra infrastructure adapters db api controllers handlers; do
        if find . -type d -name "$d" -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | grep -q .; then
          found_shell+=("$d")
          ((match_count++)) || true
        fi
      done
    fi

    local conf
    if [[ -f "$PWD/.codex/config.json" ]] && python3 -c "import json; d=json.load(open('$PWD/.codex/config.json')); exit(0 if 'layer_map' in d else 1)" 2>/dev/null; then
      conf="high"
    elif ((match_count >= 2)); then
      conf="high"
    elif ((match_count >= 1)); then
      conf="medium"
    else
      conf="none"
    fi

    _confidence="$conf"
    _core_dirs="${found_core[*]:-}"
    _shell_dirs="${found_shell[*]:-}"

    python3 -c "
import json, time
data = {
  'generated_at': int(time.time()),
  'ttl_seconds': ${_TTL},
  'confidence': '${conf}',
  'core_dirs': '${_core_dirs}'.split() if '${_core_dirs}' else [],
  'shell_dirs': '${_shell_dirs}'.split() if '${_shell_dirs}' else [],
}
json.dump(data, open('${_LAYERMAP}', 'w'))
" 2>/dev/null || true
  }

  if [[ -f "$_LAYERMAP" ]]; then
    _load_map || _generate_map
  else
    _generate_map
  fi

  if [[ "$_confidence" == "none" || -z "$_confidence" ]]; then
    exit 0
  fi

  # Determine whether the target file is in core
  _file_layer=""
  for _d in $_core_dirs; do
    if [[ "$TOOL_FILE" == *"/${_d}/"* || "$TOOL_FILE" == *"/${_d}" ]]; then
      _file_layer="core"
      break
    fi
  done

  if [[ "$_file_layer" != "core" ]]; then
    exit 0
  fi

  _import_lines="$(_regex_matching_lines '^\s*(import|from|use|require)\b' "$TOOL_CONTENT")"

  if [[ -z "$_import_lines" ]]; then
    exit 0
  fi

  # Type-only imports are allowed in core (TypeScript `import type`)
  _blocked_import=""
  _blocked_line=0

  while IFS= read -r _iline; do
    [[ -z "$_iline" ]] && continue
    _lineno="$(echo "$_iline" | cut -d: -f1)"
    _content="$(echo "$_iline" | cut -d: -f2-)"

    # Skip TypeScript type-only imports
    if [[ "$_content" =~ ^[[:space:]]*import[[:space:]]+type ]]; then
      continue
    fi

    for _shell_d in $_shell_dirs; do
      if [[ "$_content" == *"/${_shell_d}/"* || "$_content" == *"\"${_shell_d}"* || "$_content" == *"'${_shell_d}"* || "$_content" == *"/${_shell_d}"* ]]; then
        _blocked_import="$_content"
        _blocked_line="$_lineno"
        break 2
      fi
    done
  done <<<"$_import_lines"

  if [[ -z "$_blocked_import" ]]; then
    exit 0
  fi

  _blocked_import_trimmed="$(echo "$_blocked_import" | sed 's/^[[:space:]]*//')"

  _coverage_append "{\"rule\":\"BOUND-1\",\"severity\":\"BLOCK\",\"file\":\"${TOOL_FILE}\",\"line\":${_blocked_line},\"hook\":\"hook-arch-write\",\"ts\":${_ts}}"

  if [[ "$IS_CLAUDE_CODE" == "1" ]]; then
    printf '{"permissionDecision":"deny","message":"BOUND-1: Core layer import of shell/infrastructure detected.\\nFile: %s\\nImport: '"'"'%s'"'"'\\nFix: Define a port (interface/protocol/trait/function type) in core; implement the adapter in shell; have shell call into core."}' \
      "$TOOL_FILE" "$_blocked_import_trimmed"
    echo "2" >"$_EXIT_CODE_FILE"
    exit 0
  else
    echo "⚠️  BOUND-1 (BLOCK): Core layer imports shell/infrastructure in '${TOOL_FILE}' line ${_blocked_line}: '${_blocked_import_trimmed}'. Define a port in core; implement in shell."
    exit 0
  fi

) || true

_final_exit="$(cat "$_EXIT_CODE_FILE" 2>/dev/null || echo 0)"
rm -f "$_EXIT_CODE_FILE" 2>/dev/null || true
exit "$_final_exit"
