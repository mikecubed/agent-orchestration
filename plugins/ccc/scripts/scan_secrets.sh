#!/usr/bin/env bash
# scan_secrets.sh — Detect hardcoded secrets in source code
#
# Usage:
#   scan_secrets.sh [--path <dir>] [--history]
#
# Options:
#   --path <dir>   Directory or file to scan (default: current directory)
#   --history      Also scan full git history, not just working tree
#
# Output: JSON-structured findings to stdout
# Exit codes: 0 = clean, 1 = secrets found, 2 = tool/usage error
# Requires: Python 3.12+ (used for JSON normalisation)
#
# Called by: sec-check/SKILL.md (SEC-1, SEC-6)

set -euo pipefail

# Verify Python 3.12+ is available — JSON helpers use 3.12 features.
if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3,12) else 1)" 2>/dev/null; then
  echo '{"error":"scan_secrets.sh requires Python 3.12+"}' >&2
  exit 2
fi

SCAN_PATH="."
SCAN_HISTORY=false

# ── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      SCAN_PATH="${2:?--path requires an argument}"
      shift 2
      ;;
    --history)
      SCAN_HISTORY=true
      shift
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

# Validate path exists before doing any work — a missing path would silently
# produce empty findings (exit 0), creating a false "clean" result.
if [[ ! -e "$SCAN_PATH" ]]; then
  echo "{\"error\":\"--path does not exist: $SCAN_PATH\"}" >&2
  exit 2
fi

# ── Gitleaks (preferred) ──────────────────────────────────────────────────────
run_gitleaks() {
  local extra_args=()
  if [[ "$SCAN_HISTORY" == "true" ]]; then
    extra_args+=("--log-opts=--all")
  fi

  local tmp
  tmp=$(mktemp /tmp/gitleaks_out.XXXXXX.json)
  local exit_code=0

  gitleaks detect \
    --source "$SCAN_PATH" \
    --report-format json \
    --report-path "$tmp" \
    --no-banner \
    --quiet \
    "${extra_args[@]}" 2>/dev/null || exit_code=$?

  if [[ "$exit_code" -ne 0 && "$exit_code" -ne 1 ]]; then
    rm -f "$tmp"
    return 2 # gitleaks error
  fi

  # Normalize gitleaks native JSON into the same schema as the regex fallback:
  # [{file, line, pattern, match, tool, commit?}]
  python3 - "$tmp" <<'PYEOF'
import sys, json
raw = json.load(open(sys.argv[1])) or []
out = []
for f in raw:
    out.append({
        "file":    f.get("File", ""),
        "line":    f.get("StartLine", 0),
        "pattern": f.get("RuleID", ""),
        "match":   f.get("Secret", "")[:200],
        "tool":    "gitleaks",
        "commit":  f.get("Commit", ""),
    })
print(json.dumps(out))
PYEOF

  rm -f "$tmp"
  return "$exit_code"
}

# ── Regex fallback ────────────────────────────────────────────────────────────
# Applied when gitleaks is not installed.
# Patterns are intentionally broad — false positive rate is higher than gitleaks;
# review each finding manually.

REGEX_PATTERNS=(
  # Generic high-entropy assignments (PCRE case-insensitive)
  # $'...' quoting used to safely include both ' and " without fragile '\'' tricks.
  $'(?i)(password|passwd|secret|api_key|apikey|api_secret|auth_token|access_token|private_key|client_secret)\\s*[:=]\\s*["\x27]([^\\s"\x27]{8,})["\x27]'
  # AWS
  'AKIA[0-9A-Z]{16}'
  # Generic base64-ish tokens (≥32 chars in assignment context)
  '(token|key|secret|password)\s*=\s*[A-Za-z0-9+/]{32,}'
  # PEM headers in source
  '-----BEGIN (RSA |EC |OPENSSH |DSA |CERTIFICATE)'
  # GitHub PAT (classic)
  'ghp_[A-Za-z0-9]{36}'
  # GitHub fine-grained PAT
  'github_pat_[A-Za-z0-9_]{82}'
  # Slack tokens
  'xox[baprs]-[0-9A-Za-z\-]{10,}'
  # Generic JWT (3-part base64 starting with eyJ)
  'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
  # Stripe keys
  'sk_(live|test)_[0-9a-zA-Z]{24,}'
  # Sendgrid
  'SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}'
  # Database connection strings with embedded credentials
  '(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@'
)

run_regex_scan() {
  local found=0

  # Determine files to scan
  local files=()
  if [[ -d "$SCAN_PATH" ]]; then
    mapfile -t files < <(
      find "$SCAN_PATH" \
        -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.next/*" \
        ! -path "*/coverage/*" \
        ! -path "*/__pycache__/*" \
        ! -path "*/target/*" \
        \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" \
        -o -name "*.py" -o -name "*.go" -o -name "*.rs" \
        -o -name "*.env*" -o -name "*.yaml" -o -name "*.yml" \
        -o -name "*.json" -o -name "*.toml" -o -name "*.cfg" \
        -o -name "*.conf" -o -name "*.sh" \)
    )
  elif [[ -f "$SCAN_PATH" ]]; then
    files=("$SCAN_PATH")
  fi

  local tmp_findings
  tmp_findings=$(mktemp /tmp/regex_findings.XXXXXX.json)
  echo "[]" >"$tmp_findings"

  for file in "${files[@]}"; do
    for pattern in "${REGEX_PATTERNS[@]}"; do
      # Use grep -nP (Perl regex) if available, fall back to grep -nE
      local grep_results=""
      if grep -qP "." <<<"test" 2>/dev/null; then
        grep_results=$(grep -nP "$pattern" "$file" 2>/dev/null || true)
      else
        grep_results=$(grep -nE "$pattern" "$file" 2>/dev/null || true)
      fi

      if [[ -n "$grep_results" ]]; then
        found=1
        while IFS= read -r line; do
          local line_num
          line_num=$(echo "$line" | cut -d: -f1)
          local match
          match=$(echo "$line" | cut -d: -f2-)
          # Append to findings JSON — let Python build the JSON to avoid
          # backslash/quote injection from raw regex patterns or match text.
          python3 -c "
import sys, json
tmp, f, ln, pat, m = sys.argv[1:]
findings = json.load(open(tmp))
findings.append({'file': f, 'line': int(ln), 'pattern': pat,
                 'match': m[:200], 'tool': 'regex-fallback'})
json.dump(findings, open(tmp, 'w'), indent=2)
" "$tmp_findings" "$file" "$line_num" "$pattern" "$match" 2>/dev/null || true
        done <<<"$grep_results"
      fi
    done
  done

  cat "$tmp_findings"
  rm -f "$tmp_findings"
  return $found
}

# ── History scan (git log) ────────────────────────────────────────────────────
run_history_scan() {
  # Resolve to a directory; if SCAN_PATH is a file, use its parent.
  local search_dir="$SCAN_PATH"
  if [[ -f "$search_dir" ]]; then
    search_dir="$(dirname "$search_dir")"
  fi

  # Find the git repo root so git commands work regardless of subdirectory depth.
  local git_root
  if ! git_root=$(git -C "$search_dir" rev-parse --show-toplevel 2>/dev/null); then
    echo '{"error":"Not a git repository — history scan skipped"}' >&2
    return 0
  fi

  local tmp_patch
  tmp_patch=$(mktemp /tmp/git_history.XXXXXX.patch)
  echo "[]" >"$tmp_patch.json" # structured findings accumulator
  git -C "$git_root" log --all --full-diff -p \
    --no-merges \
    -- "*.ts" "*.tsx" "*.js" "*.py" "*.go" "*.rs" "*.env" "*.yaml" "*.yml" \
    >"$tmp_patch" 2>/dev/null

  local found=0

  for pattern in "${REGEX_PATTERNS[@]}"; do
    local grep_results=""
    if grep -qP "." <<<"test" 2>/dev/null; then
      grep_results=$(grep -nP "^\+.*$pattern" "$tmp_patch" 2>/dev/null || true)
    else
      grep_results=$(grep -nE "^\+.*$pattern" "$tmp_patch" 2>/dev/null || true)
    fi
    if [[ -n "$grep_results" ]]; then
      found=1
      while IFS= read -r gline; do
        local gline_num match
        gline_num=$(echo "$gline" | cut -d: -f1)
        match=$(echo "$gline" | cut -d: -f2-)
        python3 -c "
import sys, json
tmp, ln, pat, m = sys.argv[1:]
arr = json.load(open(tmp))
arr.append({'file':'(history)','line':int(ln) if ln.isdigit() else 0,
            'pattern':pat,'match':m[:200],'tool':'regex-history'})
json.dump(arr, open(tmp,'w'))
" "$tmp_patch.json" "$gline_num" "$pattern" "$match" 2>/dev/null || true
      done <<<"$grep_results"
    fi
  done

  rm -f "$tmp_patch"
  cat "$tmp_patch.json" 2>/dev/null || echo '[]'
  rm -f "$tmp_patch.json"
  return $found
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  local exit_code=0
  local output

  if command -v gitleaks &>/dev/null; then
    # Preferred: use gitleaks
    output=$(run_gitleaks) || exit_code=$?
    if [[ "$SCAN_HISTORY" == "true" && "$exit_code" -eq 0 ]]; then
      # gitleaks with --log-opts handles history; exit_code already reflects it
      :
    fi
  else
    # Fallback: regex-based scan
    >&2 echo '{"warning":"gitleaks not found — using regex fallback (higher false positive rate)"}'
    output=$(run_regex_scan) || exit_code=$?

    if [[ "$SCAN_HISTORY" == "true" ]]; then
      local hist_output
      hist_output=$(run_history_scan) || exit_code=$?
      # Merge both arrays into a single flat findings array so the envelope's
      # "findings" key is always an array (not an object with nested keys).
      if [[ -z "$output" ]] || [[ "$output" == "null" ]]; then
        output="[]"
      fi
      if [[ -z "$hist_output" ]] || [[ "$hist_output" == "null" ]]; then
        hist_output="[]"
      fi
      if [[ "$output" == "[]" ]]; then
        output="$hist_output"
      elif [[ "$hist_output" != "[]" ]]; then
        # Concatenate two JSON arrays: [a,b] + [c,d] → [a,b,c,d]
        output="${output%]}"                   # drop trailing ]
        local hist_trimmed="${hist_output#\[}" # drop leading [
        output="${output},${hist_trimmed}"
      fi
    fi
  fi

  # Wrap output in a consistent envelope
  local final_output
  if [[ -z "$output" ]] || [[ "$output" == "null" ]]; then
    output="[]"
  fi

  final_output=$(printf '{"findings":%s,"exit_code":%d}' "$output" "$exit_code")
  echo "$final_output"
  return "$exit_code"
}

main "$@"
