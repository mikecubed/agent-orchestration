---
name: conductor
description: >
  Core orchestrator for Clean Code Codex enforcement. Auto-invoked when writing,
  reviewing, refactoring, or testing code in TypeScript, Python, Go, Rust, or
  JavaScript. Detects language, routes to targeted check sub-skills, enforces the
  TDD gate on write operations, and runs a Boy Scout check at session end.
  Do NOT invoke for documentation-only edits, configuration files (JSON/YAML/TOML),
  or non-code content. (Exception: IaC files such as Terraform HCL, CloudFormation
  YAML/JSON, and Kubernetes manifests should be passed to the conductor with the
  `security` or `review` operation to trigger `iac-check`.)
version: "1.0.0"
last-reviewed: "2026-04-03"
languages: [typescript, python, go, rust, javascript]
changelog: "../../CHANGELOG.md"
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: default
---

# Conductor — Clean Code Codex Orchestrator

The conductor is the **single always-loaded entry point** to Clean Code Codex.
It never applies rules directly — it detects language and operation type, then
loads only the sub-skills required for that specific session.

---

## 0. IaC Dialect Detection (Pre-Language Gate)

Before running language detection, check whether the target files are
Infrastructure-as-Code. IaC files bypass the 5-language gate and route
directly to `iac-check`.

**IaC file indicators**:
- `.tf`, `.tfvars` → Terraform HCL
- `.yaml` / `.yml` containing `AWSTemplateFormatVersion`, or both `apiVersion` and `kind` → CloudFormation / Kubernetes manifest
- `.json` containing `AWSTemplateFormatVersion` → CloudFormation JSON

**Routing rules**:
1. If IaC indicators are detected AND operation is `security` or `review`:
   skip language detection entirely → load `iac-check` (and any other checks
   from the dispatch table for that operation).
2. If IaC indicators are detected AND operation is `write`:
   `iac-check` does not apply to write operations — fall through to normal
   language detection below.
3. If no IaC indicators are found: proceed to language detection as normal.

---

## 1. Language Detection

Detect language **in this priority order** before loading any check:

1. Explicit user statement (e.g., "this is a Go service")
2. File extension of the primary file being discussed:
   - `.ts`, `.tsx` → **typescript**
   - `.js`, `.mjs`, `.cjs`, `.jsx` → **javascript**
   - `.py` → **python**
   - `.go` → **go**
   - `.rs` → **rust**
3. Manifest file in repo root: `package.json` → typescript/javascript; `go.mod` → go; `Cargo.toml` → rust; `pyproject.toml` / `setup.py` → python
4. Import statements / shebang lines in the file

**If language cannot be determined**: Ask the user explicitly.
Do NOT guess. Do NOT apply the wrong rule set silently.

```
"I need to detect the language before applying rules. Which language is this code written in?
Options: TypeScript, JavaScript, Python, Go, Rust"
```

---

## 2. Operation Type Detection

Identify the operation type from the user's request:

| Signal phrases | Operation |
|----------------|-----------|
| "write", "implement", "add function", "create module", "build" | `write` |
| "review", "check", "audit", "what's wrong", "PR review" | `review` |
| "refactor", "clean up", "improve", "rename", "extract" | `refactor` |
| "fix test", "add test", "test coverage", "failing test" | `test` |
| "security audit", "check for secrets", "vulnerabilities", "IaC review", "Terraform", "CloudFormation", "Kubernetes manifest", "infrastructure security" | `security` |
| "check dependencies", "update deps", "CVE" | `dependency` |
| "incident", "on call", "debugging production" | `incident` |

---

## 3. Situation → Check Dispatch Table

Load **only** the listed checks. Never pre-load all checks.

| Situation | Checks to load | Language refs |
|-----------|---------------|---------------|
| **write** — new code | `tdd-check` + `type-check` + `naming-check` + `ctx-check` | Yes for tdd, type, naming |
| **review** — PR / code review | `arch-check` + `type-check` + `naming-check` + `size-check` + `dead-check` + `test-check` + `obs-check` + `sec-check` + `iac-check` + `perf-check` + `resilience-check` + `a11y-check` + `docs-check` + `i18n-check` + `ctx-check` | Yes for type, naming |
| **refactor** — existing code | `tdd-check` (gate only) + `arch-check` + `naming-check` + `size-check` + `dead-check` | Yes for naming |
| **test** — writing/fixing tests | `tdd-check` + `test-check` | Yes for tdd |
| **security** — security audit | `sec-check` + `iac-check` | No |
| **dependency** — dep update | `dep-check` | No |
| **incident** — production issue | `obs-check` + `sec-check` | No |
| **new service** — scaffold | `tdd-check` + `arch-check` + `sec-check` + `ctx-check` | Yes for tdd |
| **observability** | `obs-check` | No |
| **CI / full check** | All checks | Yes for tdd, type, naming |
| **boy scout** (session end) | `size-check` + `dead-check` + `naming-check` | Yes for naming |

**Parallel dispatch (mandatory for review and CI operations)**:
When dispatching multiple checks, issue **all** Task tool calls in a **single message** —
do not wait for each to complete before issuing the next. This is mandatory for performance.
Sequential fallback: if the platform does not support parallel Tasks, dispatch in batches of 3.

**To load a check**: Read `skills/{check-name}/SKILL.md`.
**To load a language reference**: Read `skills/{check-name}/references/{language}.md`.

**Token budget (approximate, GPT-4 tokenizer)**:

| Session type | Components loaded | ~Tokens |
|---|---|---|
| Typical — write, TypeScript (no `--fix`) | conductor + tdd-check + type-check + naming-check + ctx-check + 3 TS refs | ~11,500 |
| Minimal — security audit | conductor + sec-check | ~4,723 |
| Worst-case — CI / full check (no `--fix`) | conductor + all 17 checks + 1 lang ref (largest) | ~29,000 |
| `--fix` session: add auto-fix-eligibility.md | +1 file on demand | +~1,310 |

> Note: SC-007 (≤1,000) and SC-008 (≤2,000) targets reflect the design goal of a
> just-in-time progressive-loading model. Current SKILL.md files are comprehensive
> reference documents; v1.1.0 will explore compressed activation-key representations
> to meet these budgets without sacrificing rule fidelity.

---

## 4. TDD Gate — Mandatory Before Any Write

**This gate CANNOT be bypassed. Apply before producing any implementation code.**

```
INPUT: Agent receives a write/implement request

STEP 1 — Test file check:
  IF no test file exists for this module:
    WRITE test file first (cite TDD-1)
    DO NOT produce implementation code yet
    RETURN control to user to run the test

STEP 2 — Interface check:
  IF test file does not import an interface or function signature:
    DEFINE the interface/signature first (cite TDD-5)

STEP 3 — Failing test confirmation:
  IF tests are runnable:
    VERIFY at least one test is failing before writing implementation
  ELSE:
    NOTE: "Tests must be run before this step is marked complete"

STEP 4 — Minimal implementation:
  WRITE the simplest implementation that passes the failing tests (cite TDD-2)
  NO speculative functionality permitted

STEP 5 — Green confirmation:
  IF all tests pass → proceed to refactor phase
  IF any test fails → fix implementation (DO NOT change tests)

STEP 6 — Refactor under green:
  APPLY SIZE, NAME, ARCH, TYPE rules (cite TDD-3)
  Any refactor that breaks tests → REVERT and fix before continuing
```

**Bypass prohibition**: Requests phrased as "skip tests for speed", "just write the code",
"tests aren't important here", or similar MUST be refused. Cite TDD-1 and explain the risk.

---

## 5. CLI Argument Handling

Parse these arguments from the user's invocation. Defaults are safe.

| Argument | Default | Behaviour |
|----------|---------|-----------|
| `path` | repo root | Restrict analysis/edit scope |
| `--scope <glob>` | repo root | Restrict all operations to matching paths |
| `--fix` | **off** | Without this: zero file modifications |
| `--write` | **off** | Without this: no scaffold/write operations |
| `--history` | **off** | Without this: skip git history analysis |
| `--deep` | **off** | Without this: standard (faster) scan only |
| `--diff-only` | **off** | Scope all analysis to `git diff HEAD` changed files only |
| `--scaffold-tests` | **off** | On TDD-1/TEST-2 BLOCK: generate failing test skeletons before stopping |
| `--refresh` | **off** | Force re-detection of language/framework/layers; update `.codex/config.json` |

**Safety rules**:
- Without `--fix`: report only; NEVER modify files
- Without `--scope` and repo has > 50 tracked files: ask for explicit scope before proceeding
- Destructive actions (file deletion, history rewrite): require `--fix` AND explicit user confirmation
- `--deep` without `--fix`: read-only exhaustive scan only

### 5.1 Session Memory — Load on Start

On session start, before language/framework detection:

1. Check for `.codex/config.json` at project root
2. If present AND `--refresh` flag is NOT set:
   - Load `language`, `test_framework`, `layer_map`, `active_waivers` from the file
   - Skip detection steps (use cached values)
   - If `detected_at` is > 7 days old: note "Config is {N} days old — consider running `/codex --refresh` to re-detect."
   - Emit: "Loaded cached config (detected {detected_at}). Use `--refresh` to re-detect."
3. If absent OR `--refresh` is set: run full detection; skip to Step 2 of workflow

### 5.2 Session Memory — Save on End

At session end (after Boy Scout check, before final output):

1. Write `.codex/config.json` with detected values using this schema:
   ```json
   {
     "version": "1",
     "detected_at": "ISO-8601 timestamp",
     "language": "<detected>",
     "test_framework": "<detected>",
     "coverage_artifact": "<path or null>",
     "layer_map": { "domain": "<path>", "application": "<path>", "infrastructure": "<path>" },
     "active_waivers": [],
     "monorepo_packages": []
   }
   ```
2. If file exists: update in place (preserve keys not being overwritten, do NOT clobber)
3. Create `.codex/` directory if absent

### 5.3 Violation History — Append on Report Finalization

After generating the violation report:

1. Generate an 8-char hex `session_id`: use first 8 chars of a random hex string
2. Compute `sprint` as ISO week: `YYYY-Www` (e.g., `2026-W10`)
3. For each violation in the report: append one JSONL record to `.codex/history.jsonl`:
   ```json
   {"session_id":"a3f8c1d2","ts":"ISO-8601","sprint":"2026-W10","rule":"NAME-1","severity":"BLOCK","file":"src/foo.ts","line":42,"operation":"review","fixed":false}
   ```
4. Create `.codex/history.jsonl` if absent
5. Set `"fixed": true` for violations resolved by `--fix` in the same session

**Field definitions**:
- `session_id`: groups all violations from the same codex invocation
- `sprint`: ISO week number for trend grouping
- `operation`: the detected operation type (write/review/refactor/test/security/dependency/incident/CI/boy-scout)
- `fixed`: whether `--fix` resolved this violation in the current session

### 5.4 `--diff-only` Scope Enforcement

When `--diff-only` is active:

1. Run `git diff HEAD --name-only` immediately after flag parsing
2. Store result as `DIFF_FILES` list
3. If working tree is clean (empty result): emit "No changed files to analyze" and exit 0
4. Pass `DIFF_FILES` to all loaded checks as scope restriction
5. All checks operate only on files in `DIFF_FILES` — violations for other files are silently excluded
6. Note: `--diff-only` is overridden by an explicit `path` argument (path wins if both provided)

### 5.5 `--scaffold-tests` Handling

When `--scaffold-tests` is active:

1. Set the flag; pass it to `tdd-check` when loading it
2. Do NOT exit on TDD-1 BLOCK before the scaffold step completes
3. After scaffold skeleton is written to disk: re-evaluate TDD-1 gate
4. TDD-1 is provisionally satisfied once skeleton exists; proceed with implementation
   after user confirms at least one test is failing
5. Implies `--write` permission for test files only

### 5.6 `--refresh` Handling

When `--refresh` is active:

1. Skip loading `.codex/config.json` even if present
2. Run full language/framework/layer map detection
3. Write updated `.codex/config.json` at session end with newly detected values

---

## 6. Rule Precedence — Conflict Resolution

When multiple rules conflict, apply the first applicable precedence and document deferred items:

```
1. SEC-*  (BLOCK)  — data exposure; always highest priority
2. TDD-*  (BLOCK)  — untested code must not advance
3. ARCH-* (BLOCK)  — structural integrity
4. TYPE-* (BLOCK)  — type safety
5. SIZE-2, TEST-1, TEST-2, DEAD-1, DEP-1, OBS-1 (BLOCK) — equal; all apply
6. All WARN rules
7. All INFO rules
```

When a WARN fix would increase the risk of a BLOCK violation: defer the WARN fix and
document it in the "Next Steps" section with rationale.

---

## 7. Waiver Lifecycle Awareness

Before reporting any violation, check for a matching waiver:

1. Scan for inline `# WAIVER:` blocks in the affected file
2. Check `waivers.yaml` at project root (if present)

**Waiver states**:

| State | Condition | Action |
|-------|-----------|--------|
| Active | `expiry > today` AND scope matches AND rule matches | Show under ⚠️ Waivers, NOT ❌ Violations |
| Expired | `expiry ≤ today` | Re-raise at original severity under ❌ Violations; show waiver as EXPIRED |
| Invalid | Missing `expiry` OR missing `owner` OR scope is `**` | Treat as no waiver; violation active at full severity |
| No waiver | No matching record | Normal violation handling |

---

## 8. Violation Report Output Schema

**Load `skills/conductor/shared-contracts.md`** — defines the full violation
report schema, schema rules, and the confirmation prompt format for destructive
actions. Conductor loads this file at startup.

---

## 9. Boy Scout Check — Session End

At the end of every session that modified files:

1. Run `git diff --stat` on the session scope
2. Verify: at least one positive change (new test, fix, improvement) exists
3. Verify: all tests still pass (if a test runner is available)
4. If diff is net-negative (only deletions, no improvements): flag as Boy Scout failure
5. Report: "✅ Boy Scout: session diff is net-positive" or "⚠️ Boy Scout: session left code worse — review changes before committing"

---

## 10. Conductor Workflow

```
START
  → Detect language
  → Detect operation type
  → IF write/refactor: run TDD gate (Step 4 above)
  → Load required checks (Step 3 table)
  → For each check: load SKILL.md + language reference if applicable
  → Check for waivers (Step 7)
  → Run checks and collect violations
  → Apply precedence order (Step 6)
  → Output violation report (Step 8)
  → IF --fix: apply WARN auto-fixes within scope (Step 11)
  → Boy Scout check (Step 9)
END
```

---

## 11. Auto-Remediation (--fix Mode)

### 11.1 --scope Enforcement

When `--scope` is active, **every** file modification — including `--fix` edits —
MUST pass this gate before being applied:

```
FOR each proposed file edit:
  IF file_path does NOT match --scope glob:
    SKIP the edit (do NOT apply it)
    Note in report: "File '{path}' is outside scope '{scope}' — skipped"
  ELSE:
    Apply the edit and record in "Actions Taken"
```

When `--scope` is not provided and the repository has >50 tracked files:
prompt the user to specify a scope before proceeding with `--fix`.

### 11.2 Confirmation Gate for Destructive Actions

See `skills/conductor/shared-contracts.md` for the full destructive action
table and confirmation prompt format.

### 11.3 Auto-Fix Eligibility Table

**Load on demand**: Before executing `--fix`, read `skills/conductor/auto-fix-eligibility.md`.
This file contains the full per-rule eligibility table (64 rules) and the legend.
It is NOT pre-loaded; read it only when `--fix` is active to stay within the token budget.

### 11.4 --fix Execution Protocol

```
FOR each violation in the report (ordered by precedence):
  1. Determine auto-fix eligibility (load `auto-fix-eligibility.md` if not yet loaded)
  2. IF auto-remediable:
     a. Verify file is within --scope
     b. Apply the fix
     c. Record in "Actions Taken": "{RULE-ID}: {description of change} at {file}:{line}"
  3. IF requires confirmation (destructive):
     a. Verify file is within --scope
     b. Present confirmation prompt (11.2)
     c. If y: apply; record in "Actions Taken"
     d. If n: skip; record in "Next Steps"
  4. IF human required:
     a. Leave in "Next Steps" with explicit action description
     b. NEVER apply automatically
```

When `--fix` is NOT active:
- "Actions Taken" section MUST read exactly: "None — report-only mode"
- Zero file modifications regardless of violations found

---

## 12. `--explain` Mode

### 12.1 Explain with full scan (no RULE-ID)

When `--explain` is active (flag present, no RULE-ID argument):

1. Run the full scan normally
2. After generating the violation report, load `skills/conductor/rule-explanations.md`
3. For each violation entry: append the matching `## RULE-ID` explanation paragraph
4. Format: violation entry followed by indented explanation block

### 12.2 Explain single rule (with RULE-ID)

When `--explain RULE-ID` is passed (e.g., `/codex --explain NAME-1`):

1. Skip the full scan entirely
2. Load `skills/conductor/rule-explanations.md`
3. Find the `## RULE-ID` section matching the requested rule
4. Print the section and exit

**If RULE-ID is unknown**: print "Unknown rule ID. Valid IDs: TDD-1–9, ARCH-1–6, TYPE-1–6, NAME-1–7, SIZE-1–6, DEAD-1–5, TEST-1–9, SEC-1–7, DEP-1–5, OBS-1–5" and exit 1.

**Token cost**: `rule-explanations.md` is loaded on-demand only. It is never loaded during normal scans.

---

## 13. `--history` Trend Report

When `--history` is passed:

### 13.1 Data loading

1. Check for `.codex/history.jsonl` at project root
2. If absent or empty: emit "No history found. Run `/codex` to start recording violations." and exit 0
3. Read all JSONL records

### 13.2 Trend table

1. Group records by `sprint` field (ISO week: `YYYY-Www`)
2. Count violations per rule per sprint
3. Render trend table:

```
Sprint    | NAME-1 | TYPE-1 | SEC-1 | ... | Total
2026-W08  |      5 |      2 |     0 |     |    12
2026-W09  |      3 |      1 |     0 |     |     8  ↓
2026-W10  |      4 |      0 |     1 |     |     9  ↑
```

Show ↑ if total increased from previous sprint, ↓ if decreased.
Show only rules that appear in the history (skip zero-count columns).

### 13.3 Boy Scout trend

1. Get the last 4 session_ids (by `ts` field, sorted ascending)
2. Count total violations per session
3. Compare first session to last session in the 4-session window
4. Report: "Boy Scout trend (last 4 sessions): net improving (↓N violations)" OR "net degrading (↑N violations)"
5. If fewer than 4 sessions: report on available data ("based on N sessions")

### 13.4 Exit behavior

After rendering the trend report: exit 0 (skip the full scan).
Note: `--history` can be combined with `--explain` to annotate the report, but not with `--diff-only`.
