# Hooks — Automatic Enforcement Layer

The ccc plugin ships with a set of shell hooks that enforce security
and quality rules **automatically** — without any explicit skill invocation. Hooks
fire at write or bash execution time, giving the agent immediate feedback before (or
just after) a problematic action occurs.

---

## Hook Overview

| Rule | Script | Event | Claude Code | GH Copilot CLI |
|------|--------|-------|-------------|----------------|
| SEC-1 (secrets in writes) | `hooks/scripts/hook-sec-write.sh` | PreToolUse (Write\|Edit) | **Block** before write | Warn before write |
| SEC-7 (bash injection) | `hooks/scripts/hook-sec-bash.sh` | PreToolUse (Bash) | **Block** before execution | **Block** before execution |
| SIZE-1 / DEAD-1 (quality) | `hooks/scripts/hook-quality.sh` | PostToolUse (Write\|Edit) | Warn after write | Warn after write |
| DEP-1 (vulnerabilities) | `hooks/scripts/hook-dep.sh` | PostToolUse (Write) | Warn after write | Warn after write |
| BOUND-1 (boundary direction) | `hooks/scripts/hook-arch-write.sh` | PreToolUse (Write\|Edit) | **Block** before write | Warn before write |
| PURE-1 (side effects in core) | `hooks/scripts/hook-purity-write.sh` | PreToolUse (Write\|Edit) | **Block** before write | Warn before write |
| IMMUT-1 (parameter mutation) | `hooks/scripts/hook-immut-write.sh` | PostToolUse (Write\|Edit) | Warn after write | Warn after write |
| RESULT-1 (throw for domain failure) | `hooks/scripts/hook-result-write.sh` | PostToolUse (Write\|Edit) | Warn after write | Warn after write |
| TEST-DELTA (coverage delta) | `hooks/scripts/hook-coverage-delta.sh` | PostToolUse (Write\|Edit) | Warn after write | Warn after write |
| OBS-1 (empty catch) | `hooks/scripts/hook-obs-write.sh` | PostToolUse (Write\|Edit) | Warn after write | Warn after write |

---

## How Hooks and Skills Cooperate

Hooks write findings to a **coverage file** at:
```
/tmp/codex-hook-coverage-<PROJECT_HASH>.jsonl
```
where `PROJECT_HASH` is an 8-character md5 prefix of `$PWD` (stable per project per session).

Each line is a JSON record:
```json
{"rule":"SEC-1","severity":"BLOCK","file":"src/config.ts","line":12,"hook":"hook-sec-write","ts":1741234567}
```

When a skill is subsequently invoked, it reads this file and **skips** any finding
that was already reported by a hook in the current session — for the same
`file`+`rule`+`line` combination. This prevents duplicate reporting.

**Dedup protocol by skill**:

| Skill | What it skips |
|-------|---------------|
| `sec-check` | SEC-1 and SEC-7 findings matching `file`+`rule`+`line` |
| `dep-check` | DEP-1 findings for the same manifest `file` |
| `size-check` | SIZE-1 findings matching `file`+`line`+`function` |
| `dead-check` | DEAD-1 findings matching `file`+`line`+`end_line` |

---

## Disabling All Hooks in Claude Code

Add the following to your project's `.claude/settings.json`:

```json
{
  "disableAllHooks": true
}
```

This disables **all** hooks for the project without modifying the plugin.

---

## Disabling a Single Hook in Claude Code

To disable one specific hook, remove or comment out the corresponding entry in
`hooks/hooks.json`, or add a project-level override. The override file lives at
`.claude/settings.json`:

```json
{
  "hookOverrides": {
    "hooks/scripts/hook-quality.sh": { "disabled": true }
  }
}
```

Alternatively, copy `hooks/hooks.json` into your project at `.claude/hooks.json`
and remove the unwanted entry — Claude Code project hooks take precedence over
plugin hooks.

---

## GitHub Copilot CLI Installation

1. Copy `gh-hooks/hooks.json` from this plugin to your project:

   ```bash
   mkdir -p .github/hooks
   cp /path/to/ccc/gh-hooks/hooks.json .github/hooks/hooks.json
   ```

2. Update the script paths in `.github/hooks/hooks.json` to point to the installed
   plugin scripts. If you cloned the plugin to `~/.agent/skills/ccc/`,
   update the paths accordingly:

   ```json
   "script": "/absolute/path/to/ccc/hooks/scripts/hook-sec-bash.sh"
   ```

3. Verify the scripts are executable:

   ```bash
   chmod +x /path/to/ccc/hooks/scripts/*.sh
   ```

---

## CLI Parity Reference

| Aspect | Claude Code | GH Copilot CLI |
|--------|-------------|----------------|
| SEC-1 (write) | Pre-write **block** (deny) | Pre-write **warn** |
| SEC-7 (bash) | Pre-execution **block** | Pre-execution **block** |
| BOUND-1 (write) | Pre-write **block** (deny) | Pre-write **warn** |
| PURE-1 (write) | Pre-write **block** (deny) | Pre-write **warn** |
| IMMUT-1 | Post-write warn | Post-write warn |
| RESULT-1 | Post-write warn | Post-write warn |
| SIZE-1 | Post-write warn | Post-write warn |
| DEAD-1 | Post-write warn | Post-write warn |
| DEP-1 | Post-write warn | Post-write warn |
| OBS-1 | Post-write warn | Post-write warn |
| Pattern sets | Identical | Identical |
| Severity levels | Identical | Identical |
| Remediation messages | Identical | Identical |
| Coverage / dedup | Identical | Identical |
| Fail-open on error | Yes | Yes |
| Excluded paths | Identical | Identical |
| Test fixture downgrade | Block→Warn | Warn (unchanged) |

The documented behavioural difference for BLOCK-severity write hooks is:
Claude Code blocks the write before it happens; GitHub Copilot CLI fires the
same `PreToolUse` hook but emits a non-blocking warning and lets the write
proceed, so the agent self-corrects on the next turn. This applies to SEC-1,
BOUND-1, and PURE-1.

---

## Fail-Open Guarantee

All hook scripts wrap their logic in a fail-open subshell:

```bash
( ... ) || exit 0
```

If a hook script exits with an unexpected error, times out, or encounters a
missing dependency (e.g., `dep_audit.sh` not found), it exits `0` and allows
the agent action to proceed. A non-blocking warning may be emitted, but the
agent is never blocked by hook infrastructure failures.

---

## Pattern Files

| File | Purpose |
|------|---------|
| `hooks/patterns/secrets-high.txt` | High-confidence ERE patterns — match justifies blocking |
| `hooks/patterns/secrets-low.txt` | Low-confidence naming-based patterns — match produces WARN only |
| `hooks/patterns/bash-injection.txt` | Dangerous bash command patterns — match blocks execution |
| `hooks/patterns/excluded-dirs.txt` | Generated/vendor paths excluded from analysis; fixture paths that trigger warn-only downgrade |

---

## `hook-arch-write.sh` — Boundary Direction Enforcement

**Event**: PreToolUse  
**Trigger**: Write\|Edit  
**Rule**: BOUND-1 (BLOCK)  
**Timeout**: 10 seconds

### What it checks

Detects when a file in the `core` layer imports code from the `shell` layer. Layer boundaries follow the conductor's Section 14: prefer `core/` + `shell/` anywhere in the tree, fall back to legacy paths (`domain/`, `entities/`, `models/` → core; `application/`, `services/`, `infra/`, `adapters/`, `db/`, `api/`, `controllers/`, `handlers/` → shell).

TypeScript `import type` is exempted (type-only imports erase at compile time).

### Layer map detection

The hook generates a layer map the first time it runs and caches it at `/tmp/codex-layermap-{HASH}.json` (TTL: 5 minutes). If no layers are detected (`confidence: "none"`), the hook exits 0 with no output — it never produces false positives when it cannot determine the architecture.

### Output format

**Claude Code (block)**:
```json
{"permissionDecision":"deny","message":"BOUND-1: Core layer import of shell/infrastructure detected.\nFile: src/core/user.ts\nImport: '../../shell/db/UserRepository'\nFix: Define a port (interface/protocol/trait/function type) in core; implement the adapter in shell; have shell call into core."}
```

**GH Copilot CLI (warn)**:
```
⚠️  BOUND-1 (BLOCK): Core layer imports shell/infrastructure in 'src/core/user.ts' line 1: '../../shell/db/UserRepository'. Define a port in core; implement in shell.
```

### How to disable

Add to `.claude/settings.json`:
```json
{"hooks": {"PreToolUse": [{"matcher": "Write|Edit", "hooks": [{"script": "hooks/scripts/hook-arch-write.sh", "enabled": false}]}]}}
```

### Known limitations

- Confidence is heuristic — detection requires recognizable directory names
- Monorepo packages each get their own layer map entry
- TTL cache means layer map changes take up to 5 minutes to reflect

---

## `hook-purity-write.sh` — Functional Core Enforcement

**Event**: PreToolUse  
**Trigger**: Write\|Edit  
**Rule**: PURE-1 (BLOCK)  
**Timeout**: 10 seconds

### What it checks

Detects side-effect imports inside files in the `core/` layer (per the layermap cached by `hook-arch-write.sh`). Pattern set per language:

| Language | Detected patterns |
|---|---|
| TS/JS | `fs`, `axios`, `express`, `pg`, `mongoose`, `prisma`, `@aws-sdk/*`, `winston`, `child_process`, … |
| Python | `requests`, `httpx`, `flask`, `fastapi`, `sqlalchemy`, `psycopg`, `pymongo`, `boto3`, `subprocess`, … |
| Go | `net/http`, `database/sql`, `gin`, `gorm`, `github.com/aws/aws-sdk-go`, … |
| Rust | `std::fs`, `std::process`, `reqwest`, `axum`, `sqlx`, `diesel`, `aws_sdk`, … |

TypeScript type-only imports (`import type { Foo }`) are exempted.

### Output format

**Claude Code (block)**:
```json
{"permissionDecision":"deny","message":"PURE-1: Side-effect import in core file.\nFile: src/core/order.ts\nImport: \"import { Pool } from 'pg'\"\nFix: receive the side-effect result as a parameter from shell, or move this function to shell."}
```

**GH Copilot CLI (warn)**:
```
⚠️  PURE-1 (BLOCK): Side-effect import in core file 'src/core/order.ts' line 1: 'import { Pool } from "pg"'. Receive the result as a parameter from shell.
```

### Known limitations

- Pattern-matching only; misses dynamically constructed imports
- Only fires when the layer map has `confidence != "none"`
- Domain-failure exceptions caught at the skill level (full purity-check skill provides richer detection of clock/RNG/logging calls)

---

## `hook-immut-write.sh` — Immutability Enforcement

**Event**: PostToolUse  
**Trigger**: Write\|Edit  
**Rule**: IMMUT-1 (WARN)  
**Timeout**: 10 seconds

### What it checks

Surfaces in-place mutation methods inside core/ files: `.push`, `.splice`, `.shift`, `.pop`, `.fill`, `.copyWithin`, `Object.assign(target, ...)` (TS/JS); `list.append`, `list.extend`, `list.insert`, `list.pop`, `list.remove`, dict `.update`/`.setdefault` (Python); `sort.Slice` (Go); `.push`, `.insert`, `.remove` on common Rust collection types.

The hook is heuristic — it cannot tell whether the mutated receiver is a parameter. WARN severity acknowledges the false-positive risk. The full `immutability-check` skill makes the decision with full context.

### Output format

```
⚠️  IMMUT-1 (WARN): Mutation pattern in core file 'src/core/order.ts' line 24: 'items.push(item)'. If 'items.push(item)' mutates a parameter, return a new value instead.
```

Only one warning is emitted per file per hook run to avoid noise.

### Known limitations

- Cannot distinguish local mutation from parameter mutation
- Emits at most one finding per file
- Skipped entirely when the layer map has no core layer detected

---

## `hook-result-write.sh` — Typed-Error Enforcement

**Event**: PostToolUse  
**Trigger**: Write\|Edit  
**Rule**: RESULT-1 (WARN)  
**Timeout**: 10 seconds

### What it checks

Surfaces throw/raise/panic patterns inside core/ files that look like domain failures:

| Language | Detected patterns |
|---|---|
| TS/JS | `throw new XError(...)` (typed-error subclass — flagged because in core it should be `Result<T, E>`); `throw new Error(...)` with string args |
| Python | `raise XError(...)`, `raise XException(...)` |
| Go | `panic(...)` |
| Rust | `panic!`, `.unwrap()`, `.expect(` |

Acceptable patterns NOT flagged:
- `return Err(...)` in Rust
- `return value, err` in Go
- `Result.err(...)` / `{ ok: false, error }` returns in TS/JS

### Output format

```
⚠️  RESULT-1 (WARN): Possible domain failure thrown/raised in core 'src/core/order.ts' line 24: 'throw new OrderNotFound(id)'. Consider Result<T, E> / typed error return instead.
```

The hook emits WARN uniformly. The full `result-check` skill applies the language-specific severity calibration (BLOCK in Rust/TypeScript, WARN in Python/Go/JavaScript).

### Known limitations

- Heuristic — cannot tell if the throw is in a `default` arm of an exhaustive match
- Emits one finding per file
- Skipped entirely when the layer map has no core layer detected

---

## `hook-coverage-delta.sh` — Coverage Gap Detection

**Event**: PostToolUse  
**Trigger**: Write\|Edit  
**Rule**: TEST-DELTA (WARN)  
**Timeout**: 15 seconds

### What it checks

After a file is written or edited, extracts newly added function names (via `git diff HEAD`) and checks whether each function appears in the existing coverage artifact. If a new function is not covered, emits a warning.

### Coverage artifact locations

| Language | Default path | Format |
|---|---|---|
| TypeScript/JavaScript | `coverage/lcov.info` | lcov |
| Python | `.coverage` | coverage.py binary (auto-converted) |
| Go | `coverage.out` | go test -coverprofile |
| Rust | `tarpaulin-report.json` | tarpaulin JSON |

### Output format

```
⚠️  TEST-DELTA (WARN): New function 'verifyToken' in 'src/application/auth.ts' is not in the coverage report. Run your test suite to verify coverage.
```

If no coverage artifact is found:
```
ℹ️  TEST-DELTA (INFO): No coverage artifact found for this project. Run tests with coverage enabled to activate this check.
```

### How to disable

Add to `.claude/settings.json`:
```json
{"hooks": {"PostToolUse": [{"matcher": "Write|Edit", "hooks": [{"script": "hooks/scripts/hook-coverage-delta.sh", "enabled": false}]}]}}
```

### Known limitations

- Only checks functions added in the current write operation (not overall coverage)
- Coverage artifact must be pre-existing (hook does not run tests)
- Test files are automatically skipped

---

## `hook-obs-write.sh` — Observability Pattern Enforcement

**Event**: PostToolUse  
**Trigger**: Write\|Edit  
**Rule**: OBS-1 (WARN)  
**Timeout**: 10 seconds

### What it checks

Detects empty catch blocks, swallowed exceptions, and other observability anti-patterns in the written file content. Applies language-specific patterns.

### Detection patterns

| Language | Pattern | Example |
|---|---|---|
| TypeScript/JavaScript | Empty catch body `catch(e) {}` | `catch (err) { }` |
| TypeScript/JavaScript | Comment-only catch | `catch (err) { // ignore }` |
| Python | `except: pass` | `except Exception: pass` |
| Go | Empty nil check | `if err != nil { }` |
| Rust | Ignored/swallowed error handling | `let _ = result;`, `if let Err(err) = work() {}`, `Err(err) => {}` |

### Output format

```
⚠️  OBS-1 (WARN): Empty catch block in 'src/application/auth.ts' line 23. Add logging, rethrow, or recovery logic.
```

In test fixtures, severity is downgraded to INFO:
```
ℹ️  OBS-1 (INFO): Empty catch block in 'test/fixtures/auth.ts' line 5.
```

### How to disable

Add to `.claude/settings.json`:
```json
{"hooks": {"PostToolUse": [{"matcher": "Write|Edit", "hooks": [{"script": "hooks/scripts/hook-obs-write.sh", "enabled": false}]}]}}
```

### Known limitations

- Rust checks focus on ignored/swallowed `Result` handling and do not reason about whether an empty `Err` path is intentionally documented
- Go empty nil checks: only matches simple `if err != nil {}` patterns
