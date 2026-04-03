#!/usr/bin/env bash
# hook-arch-write.sh — ARCH-1 enforcement on Write|Edit tool calls.
# Fired as PreToolUse. Checks:
#   ARCH-1: Domain layer must not import infrastructure or application code.
#
# Exit codes:
#   0 — allow
#   2 — deny (Claude Code only, with JSON body on stdout)

# Use a temp file to carry the intended exit code out of the fail-open subshell.
# The subshell writes its intended exit code; the outer script reads and applies it.
_EXIT_CODE_FILE="$(mktemp /tmp/codex-arch-exit-XXXXXX 2>/dev/null || echo /tmp/codex-arch-exit-$$)"
echo "0" >"$_EXIT_CODE_FILE"

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

  _ts="$(date +%s)"
  _LAYERMAP="/tmp/codex-layermap-${PROJECT_HASH}.json"
  _TTL=300 # 5 minutes

  # ── Layer map: load or generate ───────────────────────────────────────────────
  _confidence=""
  _dom_dirs=""
  _app_dirs=""
  _inf_dirs=""

  _load_map() {
    local gen_at ttl_sec now
    gen_at="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('generated_at',0))" 2>/dev/null || echo 0)"
    ttl_sec="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('ttl_seconds',${_TTL}))" 2>/dev/null || echo 0)"
    now="$(date +%s)"
    if ((gen_at + ttl_sec > now)); then
      _confidence="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(d.get('confidence','none'))" 2>/dev/null || echo none)"
      _dom_dirs="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(' '.join(d.get('domain_dirs',[])))" 2>/dev/null || echo "")"
      _app_dirs="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(' '.join(d.get('application_dirs',[])))" 2>/dev/null || echo "")"
      _inf_dirs="$(python3 -c "import sys,json; d=json.load(open('${_LAYERMAP}')); print(' '.join(d.get('infrastructure_dirs',[])))" 2>/dev/null || echo "")"
      return 0
    fi
    return 1
  }

  _generate_map() {
    local src_base="$PWD/src"
    local found_dom=() found_app=() found_inf=()
    local match_count=0

    # Domain layer directories
    for d in domain core entities domain-model; do
      if [[ -d "${src_base}/${d}" ]]; then
        found_dom+=("$d")
        ((match_count++)) || true
      fi
    done

    # Application layer directories
    for d in application app use-cases use_cases usecases; do
      if [[ -d "${src_base}/${d}" ]]; then
        found_app+=("$d")
        ((match_count++)) || true
      fi
    done

    # Infrastructure layer directories
    for d in infrastructure infra adapters repositories; do
      if [[ -d "${src_base}/${d}" ]]; then
        found_inf+=("$d")
        ((match_count++)) || true
      fi
    done

    # Determine confidence
    local conf
    if [[ -f "$PWD/.codex/config.json" ]] && python3 -c "import json; d=json.load(open('$PWD/.codex/config.json')); exit(0 if 'layer_map' in d else 1)" 2>/dev/null; then
      conf="high"
    elif ((match_count >= 3)); then
      conf="high"
    elif ((match_count >= 1)); then
      conf="medium"
    else
      conf="none"
    fi

    _confidence="$conf"
    _dom_dirs="${found_dom[*]:-}"
    _app_dirs="${found_app[*]:-}"
    _inf_dirs="${found_inf[*]:-}"

    # Write JSON to temp file
    python3 -c "
import json, time
data = {
  'generated_at': int(time.time()),
  'ttl_seconds': ${_TTL},
  'confidence': '${conf}',
  'domain_dirs': '${_dom_dirs}'.split() if '${_dom_dirs}' else [],
  'application_dirs': '${_app_dirs}'.split() if '${_app_dirs}' else [],
  'infrastructure_dirs': '${_inf_dirs}'.split() if '${_inf_dirs}' else [],
}
json.dump(data, open('${_LAYERMAP}', 'w'))
" 2>/dev/null || true
  }

  # Try load, fall back to generate
  if [[ -f "$_LAYERMAP" ]]; then
    _load_map || _generate_map
  else
    _generate_map
  fi

  # Skip if no confidence
  if [[ "$_confidence" == "none" || -z "$_confidence" ]]; then
    exit 0
  fi

  # ── Determine the layer of the target file ────────────────────────────────────
  _file_layer=""

  for _d in $_dom_dirs; do
    if [[ "$TOOL_FILE" == *"/${_d}/"* || "$TOOL_FILE" == *"/${_d}" ]]; then
      _file_layer="domain"
      break
    fi
  done

  # Only care about domain layer files
  if [[ "$_file_layer" != "domain" ]]; then
    exit 0
  fi

  # ── Extract import lines from TOOL_CONTENT ────────────────────────────────────
  # Lines starting with: import, from, use, require
  _import_lines="$(echo "$TOOL_CONTENT" | grep -nP '^\s*(import|from|use|require)\b' 2>/dev/null || true)"

  if [[ -z "$_import_lines" ]]; then
    exit 0
  fi

  # ── Check each import for application/infrastructure references ───────────────
  _blocked_import=""
  _blocked_line=0

  while IFS= read -r _iline; do
    [[ -z "$_iline" ]] && continue
    _lineno="$(echo "$_iline" | cut -d: -f1)"
    _content="$(echo "$_iline" | cut -d: -f2-)"

    # Check if import path contains application or infrastructure directory names
    for _app_d in $_app_dirs; do
      if echo "$_content" | grep -qP "['\"/]${_app_d}['\"/\s]|/${_app_d}/|['\"]${_app_d}"; then
        _blocked_import="$_content"
        _blocked_line="$_lineno"
        break 2
      fi
    done

    for _inf_d in $_inf_dirs; do
      if echo "$_content" | grep -qP "['\"/]${_inf_d}['\"/\s]|/${_inf_d}/|['\"]${_inf_d}"; then
        _blocked_import="$_content"
        _blocked_line="$_lineno"
        break 2
      fi
    done
  done <<<"$_import_lines"

  if [[ -z "$_blocked_import" ]]; then
    exit 0
  fi

  # ── Violation found — emit and block ──────────────────────────────────────────
  _blocked_import_trimmed="$(echo "$_blocked_import" | sed 's/^[[:space:]]*//')"

  _coverage_append "{\"rule\":\"ARCH-1\",\"severity\":\"BLOCK\",\"file\":\"${TOOL_FILE}\",\"line\":${_blocked_line},\"hook\":\"hook-arch-write\",\"ts\":${_ts}}"

  if [[ "$IS_CLAUDE_CODE" == "1" ]]; then
    printf '{"permissionDecision":"deny","message":"ARCH-1: Domain layer import of infrastructure code detected.\\nFile: %s\\nImport: '"'"'%s'"'"'\\nFix: Inject the repository via a port interface defined in the domain layer."}' \
      "$TOOL_FILE" "$_blocked_import_trimmed"
    echo "2" >"$_EXIT_CODE_FILE"
    exit 0
  else
    echo "⚠️  ARCH-1 (BLOCK): Domain layer imports infrastructure in '${TOOL_FILE}' line ${_blocked_line}: '${_blocked_import_trimmed}'. Inject via port interface instead."
    exit 0
  fi

) || true # fail-open: errors in check logic should not block the agent

_final_exit="$(cat "$_EXIT_CODE_FILE" 2>/dev/null || echo 0)"
rm -f "$_EXIT_CODE_FILE" 2>/dev/null || true
exit "$_final_exit"
