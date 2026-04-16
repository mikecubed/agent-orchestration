---
name: arch-review
description: Structured architecture analysis evaluating layer boundaries, dependency direction, circular imports, and public API surface.
---

> References to `docs/session-md-schema.md` in this skill refer to the plugin-level `docs/` directory (`../../docs/` relative to this file). Other `docs/` paths (such as artifact output destinations) refer to the target project.

## Purpose

Use this skill when a developer or agent needs a systematic evaluation of a codebase's architectural health. It applies the ARCH-1 through ARCH-6 analytical framework to detect layer violations, circular imports, missing abstractions, and dependency direction problems. When the `map-codebase` skill has already run, this skill consumes its factual context brief to avoid redundant discovery.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "review the architecture"
- "check for circular dependencies"
- "are there layer violations?"
- "evaluate the module boundaries"
- "run an architecture audit"

Also activate when:

- preparing for a major refactor or migration;
- onboarding onto a codebase and needing to understand structural health;
- after `/flow:map-codebase` has run and the developer wants deeper analysis;
- before starting implementation work that touches cross-cutting concerns.

## Project-Specific Inputs

Before you start, identify:

- the repository root and any monorepo boundaries;
- the expected layer structure (if documented or conventional);
- the output location for the architecture report (default: `.agent/architecture-report.md`);
- whether the `arch-check` skill (from `ccc`) is available in the current session;
- any modules or directories that should be excluded from analysis;
- the acceptable severity threshold (blocking-only, or include warnings and informational).

If any critical inputs are missing, ask the developer before proceeding.

## Default Roles

Use separate roles for:

- a **scout** model or agent that gathers structural facts and dependency data;
- a **reviewer** model or agent that evaluates the gathered facts against the ARCH rules;
- a **coordinator** that manages the workflow and merges results into the final report.

The scout produces a factual context brief of the architectural structure. The reviewer applies judgment against the ARCH-1 through ARCH-6 framework. Keep fact-gathering and evaluation separate.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   These are plain YAML files (no markdown, no fenced blocks). Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is absent, fall back to the baked-in default for that role — do not re-prompt for a key that is missing.

2. **Session cache** — if models were already confirmed earlier in this session, reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use the defaults below silently without prompting. Create project model config only when the developer wants persistent overrides.

#### Default models

| Runtime       | Role        | Default model       |
|---------------|-------------|---------------------|
| Copilot CLI   | Implementer | `claude-opus-4.7`   |
| Copilot CLI   | Reviewer    | `gpt-5.4`           |
| Copilot CLI   | Scout       | `claude-haiku-4.5`  |
| Claude Code   | Implementer | `claude-opus-4.7`   |
| Claude Code   | Reviewer    | `claude-opus-4.7`   |
| Claude Code   | Scout       | `claude-haiku-4.5`  |

## Workflow

### 1. Check for existing context

Before launching discovery, check SESSION.md `## Decisions` for a `brief-path` entry from a prior `map-codebase` run.

- If `brief-path` exists and the file at that path is readable → load it as the factual context brief and skip Step 2.
- Otherwise → proceed to Step 2 for a lightweight discovery pass.

### 2. Run lightweight discovery (if needed)

If no usable brief exists, run a single scout pass to gather the minimum context needed for architecture evaluation:

- directory tree (top 3 levels);
- internal module graph (which modules import which);
- layer structure (controllers, services, repositories, or equivalent);
- public API surface (exported modules, endpoints);
- package manifests and dependency declarations.

This is a narrower pass than full `map-codebase` — it gathers only what the ARCH rules need.

### 3. Evaluate ARCH-1 through ARCH-6

Apply each rule against the gathered context. For each rule, the reviewer produces a verdict and supporting evidence.

**ARCH-1 — Layer violations**

Check whether any module bypasses its expected layer boundary. For example:
- UI or controller code importing directly from the data / repository layer;
- presentation logic embedded in business service modules.

Verdict: PASS if no violations found, FAIL with specific file and import locations.

**ARCH-2 — Circular imports / dependency cycles**

Detect circular import chains. Use static analysis tools if available (e.g., `madge`, `deptree`, `go vet`), or trace import graphs manually for smaller codebases.

Verdict: PASS if no cycles found, FAIL with the cycle chain (A → B → C → A).

**ARCH-3 — Missing public API declarations**

Check whether internal modules are accessed directly by external consumers instead of through a declared public API (e.g., index files, `__init__.py`, `mod.rs`, or explicit exports).

Verdict: PASS if all cross-boundary access goes through public APIs, FAIL with specific violations.

**ARCH-4 — Dependency direction violations**

Verify that dependencies flow in the expected direction (upper layers depend on lower layers, not the reverse). For example:
- a database module importing from an HTTP handler;
- a utility library importing from an application service.

Verdict: PASS if dependency direction is consistent, FAIL with specific inversions.

**ARCH-5 — God modules**

Identify modules with too many responsibilities. Heuristics:
- files exceeding 500 lines with multiple unrelated exports;
- modules imported by more than 60% of other modules;
- classes or objects with more than 10 public methods spanning unrelated domains.

Verdict: PASS if no god modules found, FAIL with specific modules and evidence.

**ARCH-6 — Missing or incomplete abstraction boundaries**

Check for cases where abstraction boundaries are implied but not enforced:
- direct file system or database access scattered across layers;
- configuration values read directly instead of through a config abstraction;
- shared types or interfaces that should be in a boundary module but are duplicated.

Verdict: PASS if abstraction boundaries are present and enforced, FAIL with specific gaps.

### 4. Integrate arch-check output (if available)

If the `arch-check` skill from `ccc` is available in the current session:

1. invoke it against the repository;
2. merge its violations into the architecture report under the corresponding ARCH rule;
3. de-duplicate any violations found by both the manual review and `arch-check`;
4. note in the report that `arch-check` was used.

If `arch-check` is not available, note its absence in the report and rely on the manual evaluation only.

### 5. Produce the durable architecture report

Merge all evaluation results into a single report:

1. one section per ARCH rule;
2. each section contains:
   - rule name and description;
   - verdict: PASS / FAIL;
   - severity (if FAIL): blocking / warning / informational;
   - specific violation locations (file path, line number where possible);
   - recommended action (brief, actionable);
3. a summary section with:
   - total rules evaluated;
   - pass / fail counts;
   - blocking violation count;
   - whether `arch-check` was integrated;
4. metadata header with:
   - repository path;
   - timestamp;
   - scope (full repo or subtree);
   - context source (map-codebase brief or lightweight discovery).

Write the report to the confirmed output path. If the write fails, try the fallback path `docs/architecture-report.md`.

### 6. Update SESSION.md

Write `.agent/SESSION.md` using the full schema defined in `docs/session-md-schema.md`:

```yaml
current-task: "Architecture review against ARCH-1 through ARCH-6"
current-phase: "arch-reviewed"
next-action: "address violations or proceed to implementation"
workspace: "<repository root or subtree>"
last-updated: "<ISO-8601 datetime>"
```

Required sections:

- `## Decisions` — record `report-path: <actual output path>`, context source, and arch-check availability
- `## Files Touched` — the report file path
- `## Open Questions` — any ARCH rules that could not be fully evaluated
- `## Blockers` — blocking violations that must be addressed before implementation
- `## Failed Hypotheses` — analysis approaches that did not yield results

If the SESSION.md write fails: log a warning and continue. Do not block workflow completion.

## Required Gates

### Evaluation gate

All 6 ARCH rules must be evaluated. A rule that cannot be fully evaluated (e.g., no import graph available for ARCH-2) counts as evaluated but must be recorded with an "inconclusive" verdict and the reason.

### Report artifact gate

The durable architecture report must be written to disk. If both the primary and fallback paths fail, the gate fails.

### arch-check integration gate

If the `arch-check` skill was available, its output must be included in the report. If it was not available, the report must note its absence.

### Verification checklist — review complete

Before declaring the review complete, confirm ALL of the following. Any failing item blocks the "review complete" declaration.

- [ ] All 6 ARCH rules evaluated — PASS / FAIL
- [ ] Architecture report artifact produced — PASS / FAIL
- [ ] SESSION.md written with correct phase — PASS / FAIL
- [ ] arch-check output included if available — PASS / FAIL

If any item is FAIL: report the failing item(s) by name, state what must be done to resolve each, and do not advance past the gate.

## Stop Conditions

- An ARCH rule evaluation stalls without producing a verdict; the coordinator must attempt rescue by narrowing the scope or using alternative analysis tools before abandoning it.
- The codebase scope is too large for meaningful architecture analysis — recommend running `map-codebase` first to narrow scope.
- Required analysis tools are unavailable and manual evaluation is not feasible for the codebase size.
- The developer asks to stop.
- All rule evaluations fail after rescue attempts — produce a partial report with whatever was gathered and note the failures.

When stopping, ensure any partial results are preserved as a durable artifact so work is not lost.

## Example

### Invocation

```text
Developer: review the architecture of this project before we start the refactor
```

### Architecture report output (abbreviated)

```markdown
# Architecture Review — my-app

**Repository:** /home/user/projects/my-app
**Timestamp:** 2025-07-20T15:00:00Z
**Scope:** full repository
**Context source:** map-codebase brief (.agent/codebase-brief.md)
**arch-check:** integrated

## Summary

| Rules evaluated | Pass | Fail | Blocking |
|-----------------|------|------|----------|
| 6               | 4    | 2    | 1        |

## ARCH-1 — Layer violations

**Verdict:** FAIL (blocking)

- `src/api/routes/users.ts:14` imports `src/db/prisma.ts` directly (bypasses service layer)
- `src/api/middleware/auth.ts:8` reads from `src/db/sessions.ts` directly

**Action:** Route database access through the service layer.

## ARCH-2 — Circular imports

**Verdict:** PASS

No circular import chains detected (verified with madge).

## ARCH-3 — Missing public API declarations

**Verdict:** PASS

All cross-boundary imports go through index.ts barrel files.

## ARCH-4 — Dependency direction violations

**Verdict:** FAIL (warning)

- `src/utils/logger.ts:22` imports `src/services/config.ts` (utility depending on service)

**Action:** Extract config reading into a shared config utility.

## ARCH-5 — God modules

**Verdict:** PASS

No modules exceed the responsibility threshold.

## ARCH-6 — Missing abstraction boundaries

**Verdict:** PASS

Database access is consistently abstracted through the repository layer.
```
