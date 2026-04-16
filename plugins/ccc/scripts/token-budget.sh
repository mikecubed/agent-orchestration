#!/usr/bin/env bash
# token-budget.sh — Estimate token footprints for canonical Clean Code Codex scenarios.
#
# Uses word count × 1.3 as a token approximation (same method used in docs/spec-evaluation.md).
# Exits with code 1 if the typical session estimate exceeds the TOKEN_LIMIT threshold.
#
# Usage:
#   scripts/token-budget.sh
#   scripts/token-budget.sh --limit 6000   # override token limit (default: 9000)

set -euo pipefail

SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)/skills"
TOKEN_LIMIT=9000

# Parse optional --limit flag
while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)
      TOKEN_LIMIT="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# Estimate tokens for a file (word count × 1.3, rounded)
tokens() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo 0
    return
  fi
  local words
  words=$(wc -w <"$file")
  echo $((words * 13 / 10))
}

# Sum tokens across multiple files
sum_tokens() {
  local total=0
  for f in "$@"; do
    total=$((total + $(tokens "$f")))
  done
  echo "$total"
}

# ─── Component sizes ────────────────────────────────────────────────────────
CONDUCTOR="$SKILLS_DIR/conductor/SKILL.md"
SHARED="$SKILLS_DIR/conductor/shared-contracts.md"
AUTOFX="$SKILLS_DIR/conductor/auto-fix-eligibility.md"

row() {
  printf "  %-52s %6d\n" "$1" "$2"
}

print_section() {
  printf "\n%-54s %6s\n" "$1" "tokens"
  printf '%s\n' "$(printf '─%.0s' {1..62})"
}

echo ""
echo "Clean Code Codex — Token Budget Report"
echo "Estimator: word count × 1.3"
echo ""

# ─── Scenario 1: Typical write session (TypeScript) ─────────────────────────
print_section "Scenario 1: Typical write (conductor + tdd + type + naming + 3 TS refs)"
s1=0
for component in \
  "conductor/SKILL.md:$CONDUCTOR" \
  "conductor/shared-contracts.md:$SHARED" \
  "tdd-check/SKILL.md:$SKILLS_DIR/tdd-check/SKILL.md" \
  "type-check/SKILL.md:$SKILLS_DIR/type-check/SKILL.md" \
  "naming-check/SKILL.md:$SKILLS_DIR/naming-check/SKILL.md" \
  "tdd-check/references/typescript.md:$SKILLS_DIR/tdd-check/references/typescript.md" \
  "type-check/references/typescript.md:$SKILLS_DIR/type-check/references/typescript.md" \
  "naming-check/references/typescript.md:$SKILLS_DIR/naming-check/references/typescript.md"; do
  label="${component%%:*}"
  file="${component#*:}"
  t=$(tokens "$file")
  row "$label" "$t"
  s1=$((s1 + t))
done
printf '%s\n' "$(printf '─%.0s' {1..62})"
printf "  %-52s %6d\n" "TOTAL" "$s1"

# ─── Scenario 2: Minimal security audit ────────────────────────────────────
print_section "Scenario 2: Security audit (conductor + sec-check)"
s2=0
for component in \
  "conductor/SKILL.md:$CONDUCTOR" \
  "conductor/shared-contracts.md:$SHARED" \
  "sec-check/SKILL.md:$SKILLS_DIR/sec-check/SKILL.md"; do
  label="${component%%:*}"
  file="${component#*:}"
  t=$(tokens "$file")
  row "$label" "$t"
  s2=$((s2 + t))
done
printf '%s\n' "$(printf '─%.0s' {1..62})"
printf "  %-52s %6d\n" "TOTAL" "$s2"

# ─── Scenario 3: --fix session (adds auto-fix-eligibility.md) ───────────────
print_section "Scenario 3: --fix added to Scenario 1"
s3=$((s1 + $(tokens "$AUTOFX")))
row "auto-fix-eligibility.md (on demand)" "$(tokens "$AUTOFX")"
printf '%s\n' "$(printf '─%.0s' {1..62})"
printf "  %-52s %6d\n" "TOTAL" "$s3"

# ─── Scenario 4: Worst-case CI / full check ─────────────────────────────────
print_section "Scenario 4: Worst-case CI (conductor + all 10 checks + largest lang ref)"
s4=$(tokens "$CONDUCTOR")
s4=$((s4 + $(tokens "$SHARED")))
row "conductor/SKILL.md" "$(tokens "$CONDUCTOR")"
row "conductor/shared-contracts.md" "$(tokens "$SHARED")"
for check_dir in "$SKILLS_DIR"/*/; do
  check=$(basename "$check_dir")
  [[ "$check" == "conductor" ]] && continue
  f="$check_dir/SKILL.md"
  t=$(tokens "$f")
  row "$check/SKILL.md" "$t"
  s4=$((s4 + t))
done
# Largest single language ref set (tdd-check go)
largest_ref=$(find "$SKILLS_DIR" -path "*/references/*.md" \
  -exec wc -w {} \; 2>/dev/null | sort -rn | head -1 | awk '{print $2}')
t=$(tokens "$largest_ref")
ref_label="$(echo "$largest_ref" | sed "s|$SKILLS_DIR/||")"
row "$ref_label (largest ref)" "$t"
s4=$((s4 + t))
printf '%s\n' "$(printf '─%.0s' {1..62})"
printf "  %-52s %6d\n" "TOTAL" "$s4"

# ─── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "Summary"
echo "──────────────────────────────────────────────────────────────"
printf "  %-40s %8d tokens\n" "Typical write session" "$s1"
printf "  %-40s %8d tokens\n" "Minimal security audit" "$s2"
printf "  %-40s %8d tokens\n" "Typical with --fix" "$s3"
printf "  %-40s %8d tokens\n" "Worst-case CI" "$s4"
echo ""
printf "  Typical session budget limit: %d tokens\n" "$TOKEN_LIMIT"

if ((s1 > TOKEN_LIMIT)); then
  echo ""
  echo "  ❌ BUDGET EXCEEDED: typical session (${s1}) > limit (${TOKEN_LIMIT})"
  exit 1
else
  echo "  ✅ Typical session within budget"
  exit 0
fi
