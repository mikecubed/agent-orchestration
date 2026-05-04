---
name: arch-review
description: Structured architecture analysis evaluating layer boundaries, dependency direction, circular imports, and public API surface.
---

> References to `docs/session-md-schema.md` in this skill refer to the plugin-level `docs/` directory (`../../docs/` relative to this file). Other `docs/` paths (such as artifact output destinations) refer to the target project.

## Purpose

Use this skill when a developer or agent needs a systematic evaluation of a codebase's architectural health. It applies the **ARCH-1 through ARCH-10** analytical framework to detect layer violations, circular imports, missing abstractions, dependency direction problems, inheritance used in place of composition, hidden dependency construction, dependence on concrete infrastructure (DIP/ISP violations), and missing composition roots. When the `map-codebase` skill has already run, this skill consumes its factual context brief to avoid redundant discovery.

The `arch-check` skill from the `ccc` plugin is the **canonical source** for ARCH rule IDs, names, severities, and detection signals. This skill must not redefine or diverge from those rule semantics. When `arch-check` is available in the session it is invoked directly and its findings are merged into the report; when it is not available, this skill applies the same rule definitions by reference rather than restating them.

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

The scout produces a factual context brief of the architectural structure. The reviewer applies judgment against the ARCH-1 through ARCH-10 framework. Keep fact-gathering and evaluation separate.

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

### 3. Evaluate ARCH-1 through ARCH-10

Apply each rule against the gathered context. **Use the canonical rule definitions from `ccc/skills/arch-check/SKILL.md`** — do not restate or paraphrase the rule semantics here, and do not invent diverging severities or detection signals. For each rule, the reviewer produces a verdict and supporting evidence using the canonical detection signals.

The ten rules and their headline scope:

- **ARCH-1 — No outward imports from the domain layer** (BLOCK). Confirm domain modules do not import application or infrastructure code.
- **ARCH-2 — No circular imports** (BLOCK). Trace import graphs (use `madge`, `deptree`, `go vet`, or equivalent) and report any cycle.
- **ARCH-3 — No cross-feature direct imports** (WARN). Confirm features communicate only through public APIs.
- **ARCH-4 — Infrastructure must not leak into domain or application** (BLOCK). Confirm ORM, HTTP, SDK, and framework types stay outside domain/application.
- **ARCH-5 — Cascade depth limit (≤ 2 levels)** (WARN). Identify changes whose effects fan out to more than two downstream modules.
- **ARCH-6 — Explicit public API required for every module/package** (INFO). Confirm each module declares its public surface.
- **ARCH-7 — Composition over inheritance** (WARN/BLOCK/INFO). Identify subclassing used to vary behaviour where Strategy, Decorator, Bridge, Adapter, function injection, or policy injection would suffice. Honour the canonical allowed-cases list (true domain taxonomy, framework hooks, sealed/algebraic types, exception bases, ORM-imposed inheritance).
- **ARCH-8 — Dependencies must be injected** (BLOCK/WARN/INFO). Identify hidden construction of services, repositories, gateways, clients, loggers, clocks, RNGs, configuration readers, databases, HTTP clients, queues, SDK clients, and filesystem adapters inside domain/application code. Recommend moving wiring to the composition root or a dedicated factory.
- **ARCH-9 — Depend on stable ports, not concrete infrastructure** (BLOCK/WARN/INFO). Enforce the **Dependency Inversion Principle (DIP)** and **Interface Segregation Principle (ISP)**: domain/application code must depend on small, consumer-shaped ports/protocols/traits/interfaces rather than concrete `Sql*`, `Http*`, `Prisma*`, `Redis*`, `S3*`, framework request/session, or SDK client types. Flag fat ports that bundle unrelated responsibilities.
- **ARCH-10 — Composition root owns wiring** (WARN/BLOCK/INFO). Confirm the application has a single explicit composition root that assembles the object graph; flag service locators, global containers, or recursive concrete construction inside domain/application logic.

For every rule, record:

- verdict: PASS / FAIL / INCONCLUSIVE;
- severity (if FAIL): blocking / warning / informational, **matching the canonical severity from `ccc/arch-check`**;
- specific evidence (file path, line number, symbol);
- recommended action (brief, actionable, aligned with the canonical `agent_action` for that rule).

### 4. Integrate arch-check output (if available)

If the `arch-check` skill from `ccc` is available in the current session:

1. invoke it against the repository;
2. merge its violations into the architecture report under the corresponding ARCH rule;
3. de-duplicate any violations found by both the manual review and `arch-check`;
4. note in the report that `arch-check` was used.

If `arch-check` is not available, note its absence in the report and rely on the manual evaluation only.

### 5. Produce the durable architecture report

Merge all evaluation results into a single report:

1. one section per ARCH rule (ten in total: ARCH-1 through ARCH-10);
2. each section contains:
   - rule name and description (referencing `ccc/arch-check` rather than restating);
   - verdict: PASS / FAIL / INCONCLUSIVE;
   - severity (if FAIL): blocking / warning / informational, matching the canonical CCC severity;
   - specific violation locations (file path, line number where possible);
   - recommended action (brief, actionable, aligned with the canonical `agent_action`);
3. a dedicated **Composition-First Findings** subsection that surfaces, across rules, any concerns about:
   - composition vs. inheritance choices (ARCH-7);
   - hidden dependency construction and missing dependency injection (ARCH-8);
   - DIP/ISP violations and dependence on concrete infrastructure (ARCH-9);
   - missing or fragmented composition roots, service locators, global containers (ARCH-10);
4. a summary section with:
   - total rules evaluated (10);
   - pass / fail / inconclusive counts;
   - blocking violation count;
   - whether `arch-check` was integrated;
5. metadata header with:
   - repository path;
   - timestamp;
   - scope (full repo or subtree);
   - context source (map-codebase brief or lightweight discovery);
   - canonical-rules source: `ccc/skills/arch-check/SKILL.md`.

Write the report to the confirmed output path. If the write fails, try the fallback path `docs/architecture-report.md`.

### 6. Update SESSION.md

Write `.agent/SESSION.md` using the full schema defined in `docs/session-md-schema.md`:

```yaml
current-task: "Architecture review against ARCH-1 through ARCH-10"
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

All 10 ARCH rules must be evaluated. A rule that cannot be fully evaluated (e.g., no import graph available for ARCH-2, or no clear composition root surface for ARCH-10) counts as evaluated but must be recorded with an "inconclusive" verdict and the reason.

### Report artifact gate

The durable architecture report must be written to disk. If both the primary and fallback paths fail, the gate fails.

### arch-check integration gate

If the `arch-check` skill was available, its output must be included in the report. If it was not available, the report must note its absence.

### Verification checklist — review complete

Before declaring the review complete, confirm ALL of the following. Any failing item blocks the "review complete" declaration.

- [ ] All 10 ARCH rules evaluated — PASS / FAIL
- [ ] Architecture report artifact produced — PASS / FAIL
- [ ] SESSION.md written with correct phase — PASS / FAIL
- [ ] arch-check output included if available — PASS / FAIL
- [ ] Composition-First Findings subsection present in the report — PASS / FAIL

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
| 10              | 7    | 3    | 2        |

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

## ARCH-7 — Composition over inheritance

**Verdict:** FAIL (warning)

- `src/services/pricing/BasePricingService.ts` is subclassed by 4 children that each
  override only `calculate()`. Recommend extracting a `PricingPolicy` strategy and
  injecting it into a single `PricingService`.

## ARCH-8 — Dependencies must be injected

**Verdict:** FAIL (blocking)

- `src/services/orders/OrderService.ts:18` constructs `new PrismaClient()` internally.
- `src/services/email/Mailer.ts:12` reads `process.env.SMTP_URL` directly.

**Action:** Move both dependencies to constructor parameters wired at the composition root.

## ARCH-9 — Depend on stable ports, not concrete infrastructure

**Verdict:** FAIL (blocking)

- `src/usecases/CreateOrder.ts` imports `PrismaClient` directly (DIP violation).
  Define a small `OrderRepository` port near the use case (ISP-shaped) and move the
  Prisma implementation into infrastructure.

## ARCH-10 — Composition root owns wiring

**Verdict:** PASS

`src/main.ts` is the single composition root; handlers and jobs receive their
dependencies through constructor injection.

## Composition-First Findings

- Replace inheritance-based pricing variants with a Strategy + DI (see ARCH-7).
- Eliminate hidden `new PrismaClient()` and `process.env` reads in domain/application
  code; route through the composition root (see ARCH-8).
- Introduce a narrow `OrderRepository` port to satisfy DIP/ISP (see ARCH-9).
```
