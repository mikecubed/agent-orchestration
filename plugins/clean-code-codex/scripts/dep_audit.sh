#!/usr/bin/env bash
# dep_audit.sh — Audit production dependencies for known vulnerabilities
#
# Usage:
#   dep_audit.sh [--path <dir>]
#
# Options:
#   --path <dir>   Directory to search for manifest files (default: current directory)
#
# Detects package manager from manifest files:
#   package.json          → npm / yarn / pnpm
#   pyproject.toml        → pip (via pip-audit) or uv
#   requirements.txt      → pip (via pip-audit)
#   go.mod                → go (go vuln)
#   Cargo.toml            → cargo (cargo audit)
#
# Output: JSON-structured findings to stdout
#   Schema: {vulnerabilities: [{package, vulnerable_range, patched, cve, severity,
#            package_manager}], exit_code}
#   Note: `vulnerable_range` is the affected semver range (e.g. "<2.0.1"), not
#   the installed version. npm audit v2 does not expose the installed version.
# Exit codes: 0 = clean, 1 = vulnerabilities found, 2 = tool/usage error
# Requires: Python 3.12+ (used by internal normalizer scripts)
#
# Called by: dep-check/SKILL.md (DEP-1)

set -euo pipefail

# Verify Python 3.12+ is available — normalizer scripts use 3.12 features.
if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3,12) else 1)" 2>/dev/null; then
  echo '{"error":"dep_audit.sh requires Python 3.12+"}' >&2
  exit 2
fi

SCAN_PATH="."

# ── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      SCAN_PATH="${2:?--path requires an argument}"
      shift 2
      ;;
    -h | --help)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

# Validate path is an existing directory — a missing path would silently
# produce empty findings (exit 0), creating a false "clean" result.
if [[ ! -d "$SCAN_PATH" ]]; then
  echo "{\"error\":\"--path must be an existing directory: $SCAN_PATH\"}" >&2
  exit 2
fi

# ── JSON helpers ──────────────────────────────────────────────────────────────
json_string() {
  # Escape a string for JSON embedding
  printf '%s' "$1" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))" 2>/dev/null ||
    printf '"%s"' "$(echo "$1" | sed 's/"/\\"/g')"
}

# ── npm / yarn / pnpm ─────────────────────────────────────────────────────────
audit_node() {
  local manifest="$1"
  local dir
  dir=$(dirname "$manifest")

  # Detect package manager
  local pm="npm"
  if [[ -f "$dir/yarn.lock" ]]; then
    pm="yarn"
  elif [[ -f "$dir/pnpm-lock.yaml" ]]; then
    pm="pnpm"
  fi

  local raw exit_code=0

  case "$pm" in
    npm)
      raw=$(cd "$dir" && npm audit --json 2>/dev/null) || exit_code=$?
      ;;
    yarn)
      raw=$(cd "$dir" && yarn audit --json 2>/dev/null) || exit_code=$?
      ;;
    pnpm)
      raw=$(cd "$dir" && pnpm audit --json 2>/dev/null) || exit_code=$?
      ;;
  esac

  # Write raw output to temp file so Python can read it (heredoc owns stdin)
  local tmp_raw
  tmp_raw=$(mktemp /tmp/audit_raw.XXXXXX.json)
  printf '%s' "$raw" >"$tmp_raw"

  # Normalise npm/yarn/pnpm audit JSON into our schema
  python3 - "$pm" "$tmp_raw" <<'PYEOF'
import sys, json

pm = sys.argv[1]
raw_file = sys.argv[2]

vulns = []

if pm == "npm":
    try:
        raw = json.loads(open(raw_file).read())
    except Exception:
        print(json.dumps({"vulnerabilities": [], "error": "Could not parse npm audit output"}))
        sys.exit(0)
    advisories = raw.get("vulnerabilities", {})
    for name, info in advisories.items():
        severity = info.get("severity", "unknown").upper()
        if severity in ("HIGH", "CRITICAL"):
            vulns.append({
                "package": name,
                "vulnerable_range": info.get("range", "unknown"),
                "patched": info.get("fixAvailable", {}).get("version", "unknown") if isinstance(info.get("fixAvailable"), dict) else "unknown",
                "cve": ", ".join(info.get("via", [{}])[0].get("cve", []) if isinstance(info.get("via", [{}])[0], dict) else []),
                "severity": severity,
                "package_manager": pm,
            })
elif pm in ("yarn", "pnpm"):
    # yarn/pnpm audit --json outputs NDJSON (one JSON object per line)
    for line in open(raw_file):
        line = line.strip()
        if not line:
            continue
        try:
            advisory = json.loads(line)
        except Exception:
            continue
        data = advisory.get("data", {}).get("advisory", {}) if isinstance(advisory, dict) else {}
        severity = data.get("severity", "unknown").upper()
        if severity in ("HIGH", "CRITICAL"):
            vulns.append({
                "package": data.get("module_name", "unknown"),
                "vulnerable_range": data.get("vulnerable_versions", "unknown"),
                "patched": data.get("patched_versions", "unknown"),
                "cve": data.get("cves", ["unknown"])[0] if data.get("cves") else "unknown",
                "severity": severity,
                "package_manager": pm,
            })

print(json.dumps({"vulnerabilities": vulns}))
PYEOF

  rm -f "$tmp_raw"
  return $exit_code
}

# ── Python (pip-audit or safety) ──────────────────────────────────────────────
audit_python() {
  local dir="$1"
  local raw exit_code=0

  if command -v pip-audit &>/dev/null; then
    raw=$(cd "$dir" && pip-audit --format json 2>/dev/null) || exit_code=$?
    local tmp_raw
    tmp_raw=$(mktemp /tmp/audit_raw.XXXXXX.json)
    printf '%s' "$raw" >"$tmp_raw"
    python3 - "$tmp_raw" <<'PYEOF'
import sys, json
try:
    raw = json.loads(open(sys.argv[1]).read())
except Exception:
    print(json.dumps({"vulnerabilities": [], "error": "Could not parse pip-audit output"}))
    sys.exit(0)

vulns = []
for dep in raw.get("dependencies", []):
    for vuln in dep.get("vulns", []):
        vulns.append({
            "package": dep.get("name", "unknown"),
            "current": dep.get("version", "unknown"),
            "patched": (vuln.get("fix_versions") or ["unknown"])[0],
            "cve": vuln.get("id", "unknown"),
            "severity": "UNKNOWN",
            "package_manager": "pip-audit",
        })
print(json.dumps({"vulnerabilities": vulns}))
PYEOF
    rm -f "$tmp_raw"
  elif command -v safety &>/dev/null; then
    raw=$(cd "$dir" && safety check --json 2>/dev/null) || exit_code=$?
    local tmp_raw
    tmp_raw=$(mktemp /tmp/audit_raw.XXXXXX.json)
    printf '%s' "$raw" >"$tmp_raw"
    python3 - "$tmp_raw" <<'PYEOF'
import sys, json
try:
    raw = json.loads(open(sys.argv[1]).read())
except Exception:
    print(json.dumps({"vulnerabilities": [], "error": "Could not parse safety output"}))
    sys.exit(0)

vulns = []
for item in (raw if isinstance(raw, list) else []):
    vulns.append({
        "package": item[0] if len(item) > 0 else "unknown",
        "current": item[2] if len(item) > 2 else "unknown",
        "patched": "see advisory",
        "cve": item[4] if len(item) > 4 else "unknown",
        "severity": "UNKNOWN",
        "package_manager": "safety",
    })
print(json.dumps({"vulnerabilities": vulns}))
PYEOF
    rm -f "$tmp_raw"
  else
    echo '{"vulnerabilities":[],"warning":"pip-audit and safety not found — install pip-audit for Python vulnerability scanning"}'
    return 0
  fi

  return $exit_code
}

# ── Go ────────────────────────────────────────────────────────────────────────
audit_go() {
  local dir="$1"
  local raw exit_code=0

  if command -v govulncheck &>/dev/null; then
    raw=$(cd "$dir" && govulncheck -json ./... 2>/dev/null) || exit_code=$?
    local tmp_raw
    tmp_raw=$(mktemp /tmp/audit_raw.XXXXXX.json)
    printf '%s' "$raw" >"$tmp_raw"
    python3 - "$tmp_raw" <<'PYEOF'
import sys, json

# govulncheck outputs NDJSON (one JSON object per line)
vulns = []
for line in open(sys.argv[1]):
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except Exception:
        continue
    vuln = obj.get("vulnerability", {})
    if vuln:
        for mod in vuln.get("modules", []):
            vulns.append({
                "package": mod.get("path", "unknown"),
                "current": mod.get("found_version", "unknown"),
                "patched": mod.get("fixed_version", "unknown"),
                "cve": vuln.get("id", "unknown"),
                "severity": "UNKNOWN",
                "package_manager": "govulncheck",
            })
print(json.dumps({"vulnerabilities": vulns}))
PYEOF
    rm -f "$tmp_raw"
  else
    echo '{"vulnerabilities":[],"warning":"govulncheck not found — install with: go install golang.org/x/vuln/cmd/govulncheck@latest"}'
    return 0
  fi

  return $exit_code
}

# ── Rust ─────────────────────────────────────────────────────────────────────
audit_rust() {
  local dir="$1"
  local raw exit_code=0

  if command -v cargo-audit &>/dev/null; then
    raw=$(cd "$dir" && cargo audit --json 2>/dev/null) || exit_code=$?
    local tmp_raw
    tmp_raw=$(mktemp /tmp/audit_raw.XXXXXX.json)
    printf '%s' "$raw" >"$tmp_raw"
    python3 - "$tmp_raw" <<'PYEOF'
import sys, json
try:
    raw = json.loads(open(sys.argv[1]).read())
except Exception:
    print(json.dumps({"vulnerabilities": [], "error": "Could not parse cargo audit output"}))
    sys.exit(0)

vulns = []
for vuln in raw.get("vulnerabilities", {}).get("list", []):
    advisory = vuln.get("advisory", {})
    pkg = vuln.get("package", {})
    vulns.append({
        "package": pkg.get("name", "unknown"),
        "current": pkg.get("version", "unknown"),
        "patched": advisory.get("patched_versions", ["unknown"])[0] if advisory.get("patched_versions") else "unknown",
        "cve": advisory.get("aliases", ["unknown"])[0] if advisory.get("aliases") else advisory.get("id", "unknown"),
        "severity": advisory.get("cvss", {}).get("score", "UNKNOWN"),
        "package_manager": "cargo-audit",
    })
print(json.dumps({"vulnerabilities": vulns}))
PYEOF
    rm -f "$tmp_raw"
  else
    echo '{"vulnerabilities":[],"warning":"cargo-audit not found — install with: cargo install cargo-audit"}'
    return 0
  fi

  return $exit_code
}

# ── Merge helper ─────────────────────────────────────────────────────────────
# Write auditor JSON to a temp file, merge into tmp_out via Python (safe from
# backslash-injection that would occur with json.loads("""$var""") literals).
_merge_into() {
  local tmp_out="$1" raw="$2"
  local tmp_res
  tmp_res=$(mktemp /tmp/dep_audit_merge.XXXXXX.json)
  printf '%s\n' "$raw" >"$tmp_res"
  python3 - "$tmp_out" "$tmp_res" <<'PYEOF'
import sys, json
tmp, raw_path = sys.argv[1], sys.argv[2]
existing = json.load(open(tmp))
with open(raw_path) as fh:
    new = json.load(fh)
existing["vulnerabilities"].extend(new.get("vulnerabilities", []))
if "warning" in new: existing.setdefault("warnings", []).append(new["warning"])
json.dump(existing, open(tmp, "w"), indent=2)
PYEOF
  rm -f "$tmp_res"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  local found=0
  local tool_error=0
  local ec tmp_out
  tmp_out=$(mktemp /tmp/dep_audit_result.XXXXXX.json)
  echo '{"vulnerabilities":[]}' >"$tmp_out"

  # Detect and run appropriate auditors. Track exit codes explicitly so that
  # exit 1 (vulnerabilities found) and exit >1 (tool/usage error) are distinct.
  if [[ -f "$SCAN_PATH/package.json" ]]; then
    local node_result
    node_result=$(audit_node "$SCAN_PATH/package.json" </dev/null) || ec=$?
    [[ ${ec:-0} -gt 1 ]] && tool_error=1 || [[ ${ec:-0} -eq 1 ]] && found=1
    ec=0
    _merge_into "$tmp_out" "$node_result"
  fi

  if [[ -f "$SCAN_PATH/pyproject.toml" ]] || [[ -f "$SCAN_PATH/requirements.txt" ]]; then
    local py_result
    py_result=$(audit_python "$SCAN_PATH" </dev/null) || ec=$?
    [[ ${ec:-0} -gt 1 ]] && tool_error=1 || [[ ${ec:-0} -eq 1 ]] && found=1
    ec=0
    _merge_into "$tmp_out" "$py_result"
  fi

  if [[ -f "$SCAN_PATH/go.mod" ]]; then
    local go_result
    go_result=$(audit_go "$SCAN_PATH" </dev/null) || ec=$?
    [[ ${ec:-0} -gt 1 ]] && tool_error=1 || [[ ${ec:-0} -eq 1 ]] && found=1
    ec=0
    _merge_into "$tmp_out" "$go_result"
  fi

  if [[ -f "$SCAN_PATH/Cargo.toml" ]]; then
    local rust_result
    rust_result=$(audit_rust "$SCAN_PATH" </dev/null) || ec=$?
    [[ ${ec:-0} -gt 1 ]] && tool_error=1 || [[ ${ec:-0} -eq 1 ]] && found=1
    ec=0
    _merge_into "$tmp_out" "$rust_result"
  fi

  # Add exit code and emit
  local emit_code=$((tool_error > 0 ? 2 : found))
  python3 - "$tmp_out" "$emit_code" <<'PYEOF'
import sys, json
tmp = sys.argv[1]
exit_code = int(sys.argv[2])
result = json.load(open(tmp))
result["exit_code"] = exit_code
print(json.dumps(result, indent=2))
PYEOF

  rm -f "$tmp_out"
  [[ $tool_error -gt 0 ]] && return 2
  return $found
}

main "$@"
