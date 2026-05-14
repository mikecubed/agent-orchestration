#!/usr/bin/env bash
# hook-purity-write.sh — PURE-1 enforcement on Write|Edit tool calls.
# Fired as PreToolUse. Blocks side-effect imports in files inside the core layer.
#
# Side-effect imports detected (heuristic):
#   I/O: fs, fs/promises, axios, requests, httpx, sqlalchemy, pg, mongoose, prisma, …
#   Frameworks: express, fastapi, flask, gin, actix, …
#   Clock/RNG/Logging: console, print/logging, time/datetime, random
#
# Layer detection mirrors hook-arch-write.sh — uses the cached layermap.
#
# Exit codes:
#   0 — allow
#   2 — deny (Claude Code only)

_EXIT_CODE_FILE="$(mktemp /tmp/codex-pure-exit-XXXXXX 2>/dev/null || echo /tmp/codex-pure-exit-$$)"
echo "0" >"$_EXIT_CODE_FILE"

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

  _ext="${TOOL_FILE##*.}"

  # Per-language side-effect import patterns (anchored, conservative)
  _patterns=()
  case "$_ext" in
    ts|tsx|js|jsx|mjs|cjs)
      _patterns=(
        "^[[:space:]]*import[[:space:]]+[^t][^y][^p][^e].*from[[:space:]]+['\"](fs|fs/promises|node:fs|axios|node-fetch|undici|got|ky|express|fastify|koa|@nestjs/|hono|pg|mysql2|mongoose|mongodb|redis|ioredis|prisma|@prisma/|drizzle-orm|typeorm|knex|@aws-sdk/|@azure/|@google-cloud/|firebase|firebase-admin|winston|pino|bunyan|child_process|node:os|node:process)"
        "^[[:space:]]*const[[:space:]]+.*=[[:space:]]*require\\(['\"](fs|axios|express|fastify|pg|mongoose|prisma|@aws-sdk)"
      )
      ;;
    py)
      _patterns=(
        "^[[:space:]]*(import|from)[[:space:]]+(requests|httpx|urllib|aiohttp|flask|fastapi|django|starlette|tornado|sqlalchemy|psycopg|psycopg2|pymongo|redis|motor|asyncpg|boto3|botocore|google\\.cloud|azure|subprocess|os\\.system)\\b"
        "^[[:space:]]*from[[:space:]]+(requests|httpx|flask|fastapi|sqlalchemy|psycopg|psycopg2|boto3)[[:space:]]+import"
      )
      ;;
    go)
      _patterns=(
        "^[[:space:]]*\"(net/http|database/sql|os/exec|github.com/gin-gonic|github.com/labstack/echo|github.com/gofiber|gorm.io/gorm|github.com/lib/pq|github.com/aws/aws-sdk-go|cloud.google.com/go|go.mongodb.org/mongo-driver|github.com/redis/go-redis)\""
      )
      ;;
    rs)
      _patterns=(
        "^[[:space:]]*use[[:space:]]+(std::fs|std::process|tokio::fs|tokio::process|reqwest|hyper|surf|ureq|isahc|actix_web|axum|rocket|warp|sqlx|diesel|sea_orm|mongodb|tokio_postgres|rusqlite|aws_sdk)"
      )
      ;;
    *)
      exit 0
      ;;
  esac

  _matched_line=""
  _matched_lineno=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    _lineno="$(echo "$line" | cut -d: -f1)"
    _content="$(echo "$line" | cut -d: -f2-)"
    for _pat in "${_patterns[@]}"; do
      if echo "$_content" | grep -qE "$_pat" 2>/dev/null; then
        _matched_line="$_content"
        _matched_lineno="$_lineno"
        break 2
      fi
    done
  done < <(_regex_matching_lines '^\s*(import|from|use|require|const\b.*require)' "$TOOL_CONTENT")

  if [[ -z "$_matched_line" ]]; then
    exit 0
  fi

  _matched_trimmed="$(echo "$_matched_line" | sed 's/^[[:space:]]*//')"

  _coverage_append "{\"rule\":\"PURE-1\",\"severity\":\"BLOCK\",\"file\":\"${TOOL_FILE}\",\"line\":${_matched_lineno},\"hook\":\"hook-purity-write\",\"ts\":${_ts}}"

  if [[ "$IS_CLAUDE_CODE" == "1" ]]; then
    printf '{"permissionDecision":"deny","message":"PURE-1: Side-effect import in core file.\\nFile: %s\\nImport: '"'"'%s'"'"'\\nFix: receive the side-effect result as a parameter from shell, or move this function to shell."}' \
      "$TOOL_FILE" "$_matched_trimmed"
    echo "2" >"$_EXIT_CODE_FILE"
    exit 0
  else
    echo "⚠️  PURE-1 (BLOCK): Side-effect import in core file '${TOOL_FILE}' line ${_matched_lineno}: '${_matched_trimmed}'. Receive the result as a parameter from shell."
    exit 0
  fi

) || true

_final_exit="$(cat "$_EXIT_CODE_FILE" 2>/dev/null || echo 0)"
rm -f "$_EXIT_CODE_FILE" 2>/dev/null || true
exit "$_final_exit"
