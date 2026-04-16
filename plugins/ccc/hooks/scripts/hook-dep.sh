#!/usr/bin/env bash
# hook-dep.sh — DEP-1 enforcement on Write of package manifest files.
# Fired as PostToolUse on Write tool calls. Scans the written manifest for known
# HIGH/CRITICAL vulnerabilities using scripts/dep_audit.sh.
#
# Exit codes:
#   0 — always (findings are surfaced as stdout warnings, never blocking writes)

(
  set -euo pipefail

  _SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${_SCRIPT_DIR}/hook-lib.sh"

  # Only applies to Write
  if [[ "$TOOL_NAME" != "Write" ]]; then
    exit 0
  fi

  # Skip excluded paths
  if [[ "$IS_EXCLUDED" == "1" ]]; then
    exit 0
  fi

  # Only act on manifest files
  _basename="$(basename "${TOOL_FILE:-}")"
  case "$_basename" in
    package.json | pyproject.toml | requirements.txt | go.mod | Cargo.toml) ;;
    *) exit 0 ;;
  esac

  # Locate dep_audit.sh relative to project root
  _REPO_ROOT="$(cd "${_SCRIPT_DIR}/../../.." && pwd 2>/dev/null || echo "")"
  _AUDIT_SCRIPT="${_REPO_ROOT}/scripts/dep_audit.sh"

  if [[ ! -x "$_AUDIT_SCRIPT" ]]; then
    # Try path relative to common plugin install locations
    _AUDIT_SCRIPT="$(find /usr /home ~/.agent ~/.local -name dep_audit.sh -maxdepth 10 2>/dev/null | head -1)"
  fi

  if [[ -z "$_AUDIT_SCRIPT" || ! -x "$_AUDIT_SCRIPT" ]]; then
    echo "⚠️  DEP-1: dep_audit.sh not found or not executable — skipping vulnerability scan for '${TOOL_FILE}'."
    exit 0
  fi

  _manifest_dir="$(dirname "${TOOL_FILE}")"

  # Run audit and parse JSON output
  _audit_json="$("${_AUDIT_SCRIPT}" --path "${_manifest_dir}" 2>/dev/null || echo '{"vulnerabilities":[]}')"

  if [[ -z "$_audit_json" ]]; then
    exit 0
  fi

  # Parse vulnerabilities array for HIGH/CRITICAL entries
  _findings="$(echo "$_audit_json" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    vulns = data.get('vulnerabilities', [])
    for v in vulns:
        sev = v.get('severity', '').upper()
        if sev in ('HIGH', 'CRITICAL'):
            pkg = v.get('package', 'unknown')
            vrange = v.get('vulnerable_range', v.get('affected_range', '?'))
            patched = v.get('patched', '?')
            cve = v.get('cve', v.get('id', '?'))
            print(f\"DEP-1 (WARN): Known vulnerability in '{pkg}' (affected range: {vrange}) — {cve} ({sev}). Patched in v{patched}.\")
            print(f\"__RECORD__{pkg}|{vrange}|{cve}|{sev}\")
except Exception:
    pass
" 2>/dev/null || echo "")"

  if [[ -n "$_findings" ]]; then
    _line_ts="$(date +%s)"
    while IFS= read -r line; do
      if [[ "$line" == __RECORD__* ]]; then
        _rec="${line#__RECORD__}"
        _coverage_append "{\"rule\":\"DEP-1\",\"severity\":\"WARN\",\"file\":\"${TOOL_FILE}\",\"line\":0,\"detail\":\"${_rec}\",\"hook\":\"hook-dep\",\"ts\":${_line_ts}}"
      else
        echo "⚠️  $line"
      fi
    done <<<"$_findings"
  fi

  exit 0
) || exit 0 # fail-open
