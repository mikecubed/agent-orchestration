# Changelog

All notable changes to this repository should be documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

## [ccc 4.0.0] - 2026-05-14

### BREAKING CHANGES (ccc 4.0.0)

The `ccc` plugin (Composable Code Codex, formerly Clean Code Codex) has been
modernized away from OOP-flavored "clean code" enforcement toward functional-core
/ pure-function-first discipline. Rule IDs and skill directories have changed.
There is no migration tooling — existing waivers and `.codex/config.json`
references must be updated by hand.

#### Rebrand

- **"Clean Code Codex" → "Composable Code Codex"** across manifests, README,
  conductor metadata, and rule citations.
- Plugin slug unchanged: `ccc` (preserves the `/codex` command and marketplace
  paths).
- Umbrella `metadata.version` unchanged at 3.1.0 — this is a ccc-only bump.

#### Skill renames and removals

| Before | After | Notes |
|---|---|---|
| `tdd-check` | `gate-check` | TDD framing replaced with test-pinned correctness at merge |
| `ctx-check` | `session-check` | "Context" namespace freed for new strategic-DDD context-check |
| `arch-check` (old ARCH-1..10) | `arch-check` (BOUND-1..4 + COMP-1) | Boundary direction, port stability, composition root, no-cycle, composition over inheritance |
| (new) | `purity-check` | PURE-1..3 — functional-core enforcement |
| (new) | `immutability-check` | IMMUT-1..3 — value discipline in core |
| (new) | `result-check` | RESULT-1..3 — typed errors over exceptions for domain failures |
| (new) | `context-check` | CTXT-1..3 — strategic DDD signals (bounded contexts, ubiquitous language, ACL) |

#### Rule ID map (old → new)

| Old | New | Notes |
|---|---|---|
| TDD-1..9 | TEST-PINNED + TEST-RED-FIRST (gate-check) | Strict ordering replaced with test-pinned correctness at merge |
| TDD-2 (test names) | NAME-7 (already existed) | Test-name discipline lives in naming-check |
| TDD-3 (test ratio) | (dropped) | Vacuous tests gamed this; replaced by TEST-VACUOUS in test-check |
| TDD-4 (test naming) | NAME-7 | Same |
| TDD-5 (test isolation) | TEST-6 (already existed) | Existing rule covered this |
| TDD-6 (mocks for I/O) | TEST-NO-MOCK-FOR-PURE (test-check) | Inverted: mocks for pure functions BLOCKED, mocks for I/O allowed |
| TDD-7 (mock discipline) | TEST-BEHAVIOR + TEST-NO-MOCK-FOR-PURE | Implementation-pinning + mocking-pure-functions |
| TDD-8 (property-based) | (dropped) | Too aspirational per pragmatism principle |
| TDD-9 (mutation score) | TEST-9 (already existed; demoted to INFO) | Aspirational, not gating |
| ARCH-1 (no outward imports from domain) | BOUND-1 | Renamed; layer detection now prefers core/+shell/ |
| ARCH-2 (no circular imports) | BOUND-4 | Renamed |
| ARCH-3 (no cross-feature direct imports) | (dropped) | Heuristic; relied on `internal/` convention; replaced by case-by-case review |
| ARCH-4 (infra leaks into domain/app) | BOUND-1 | Merged with ARCH-1 — both about inward-direction violations |
| ARCH-5 (cascade depth limit) | (dropped) | Too aspirational per pragmatism principle |
| ARCH-6 (explicit public API required) | (dropped) | Aspirational; was already INFO |
| ARCH-7 (composition over inheritance) | COMP-1 | Renamed; severity nuance + carve-outs preserved |
| ARCH-8 (dependencies must be injected) | BOUND-3 | Merged with ARCH-10 — both about composition-root wiring |
| ARCH-9 (depend on stable ports, not concrete infra) | BOUND-2 | Renamed |
| ARCH-10 (composition root owns wiring) | BOUND-3 | Merged with ARCH-8 |
| CTX-1..3 (session hygiene) | SESS-1..3 | Skill renamed ctx-check → session-check |
| (new) | PURE-1..3 | Side effects / ambient state / mock-required signal in core |
| (new) | IMMUT-1..3 | Parameter mutation / shared mutable state / partial construction |
| (new) | RESULT-1..3 | Domain failures as values / Option for not-found / no silent swallow |
| (new) | TYPED-1..2 | Newtype wrappers / sum types for state machines |
| (new) | NAME-UL | Ubiquitous-language alignment in core |
| (new) | TEST-PINNED | Every new symbol must have a test that imports + calls it |
| (new) | TEST-RED-FIRST | Tests must record a red→green transition |
| (new) | TEST-BEHAVIOR | No implementation-pinning (mock-count, private-state) assertions |
| (new) | TEST-NO-MOCK-FOR-PURE | Mocks of pure functions BLOCK |
| (new) | TEST-VACUOUS | Tests with no assertion or truthy-only checks |
| (new) | CTXT-1..3 | Strategic-DDD signals |

#### Severity philosophy

- **BLOCK** is reserved for structural / mechanical failures with no judgment
  call (side effects in core, mocks of pure functions, parameter mutation,
  missing tests at session end).
- **WARN** is the default for heuristic, language-dependent, or context-sensitive
  concerns (typed errors in Python/JS, primitive obsession, generic naming).
- **INFO** is advisory / aspirational (ubiquitous language, formal context
  maps, sum types in languages without ergonomic support).

This is the formal version of the pragmatism-over-dogma calibration applied
throughout the v4 rules: enforcement catches real agent failures, not paradigm
violations.

### Added (ccc 4.0.0)

- **PR-1** (#42): rebrand to "Composable Code Codex"; conductor Section 14
  layered layer detection (prefer `core/`+`shell/`, fall back to legacy paths,
  prompt-and-cache as last resort); fixed Windows `execFileSync('npm')` bug in
  4 test files.
- **PR-2** (#43): paradigm rules and skill restructuring — `gate-check`,
  `arch-check` rewrite (BOUND-1..4 + COMP-1), `test-check` (TEST-BEHAVIOR,
  TEST-NO-MOCK-FOR-PURE, TEST-VACUOUS), `naming-check` NAME-UL, `type-check`
  TYPED-1..2; new `purity-check`, `immutability-check`, `result-check`
  skills (SKILL.md only); conductor wiring, auto-fix-eligibility,
  rule-explanations updated; deleted obsolete `composition-arch.test.js`.
- **PR-3** (this entry): new `context-check` skill (CTXT-1..3) — strategic DDD
  signals; per-language reference files for `purity-check`,
  `immutability-check`, `result-check` (5 languages each); hook rewrites
  (`hook-arch-write.sh` → BOUND-1; new `hook-purity-write.sh`,
  `hook-immut-write.sh`, `hook-result-write.sh`); stale TDD-4/7/8/9 references
  removed from `gate-check/references/*.md`.

### Changed (ccc 4.0.0)

- **Version sync**: `plugins/ccc/plugin.json`, `plugins/ccc/.claude-plugin/plugin.json`,
  and `plugins/ccc/package.json` bumped from 3.x → 4.0.0.
- **Description**: ccc now advertises "composition-first, pure-function-friendly"
  rather than "clean-code enforcement".
- **Rule precedence**: SEC → gate → BOUND/PURE/RESULT/TYPED → COMP/IMMUT →
  quality BLOCK → WARN → INFO.
- **Hooks**: `hook-arch-write.sh` now cites BOUND-1 (was ARCH-1) and uses
  Section 14 layer detection. Three new hooks added for PURE-1, IMMUT-1,
  RESULT-1.

### Removed (ccc 4.0.0)

- Skills: `tdd-check`, `ctx-check` (renamed; see map above).
- Rules: TDD-1..9 (replaced by gate + test-check rules), ARCH-1..10 (replaced
  by BOUND-1..4 + COMP-1), CTX-1..3 (renamed to SESS-1..3).
- Test file: `plugins/ccc/test/composition-arch.test.js` (covered v3 rules that
  no longer exist).
- TDD-3 (test ratio) and TDD-8 (property-based tests) — dropped per pragmatism
  principle.

## [3.0.1] - 2026-05-04

### Fixed (flow 3.0.1)

- **SDD workflow restoration**: `flow` SDD agents now carry the detailed
  specify, plan, and tasks workflow instructions that were accidentally dropped
  when the old `sdd-workflow` command files were merged into `flow`.
- **Flow-native SDD handoffs**: restored SDD agents keep the v3 `flow` shape
  with hyphenated agent names such as `sdd-plan` and `sdd-tasks`, avoiding the
  old dotted `sdd.plan` / `sdd.tasks` references.
- **Regression coverage**: the flow plugin layout tests now verify that SDD
  agents are declared, packaged, flow-native, and contain the detailed workflow
  bodies.
- **Version sync**: umbrella and flow metadata bumped from `3.0.0` to `3.0.1`
  across package manifests, marketplace metadata, plugin manifests, and lockfile.

## [2.2.0] - 2026-04-15

### Added (workflow-orchestration 2.2.0)

- **Hard concurrency cap**: `parallel-implementation-loop` and
  `pr-review-resolution-loop` now enforce a configurable
  `max-parallel-tracks` limit (default: 2) read from
  `.workflow-orchestration/defaults.json`. Excess tracks are queued and
  launched as slots free up. Rescue agents count against the cap.
- **Concurrency defaults contract**: the workflow defaults contract gains a
  `concurrency` key group with `max-parallel-tracks` and
  `rescue-min-stall-checks`, overridable by explicit developer input.

### Changed (workflow-orchestration 2.2.0)

- **No-parallel-rescue prohibition**: both `parallel-implementation-loop` and
  `pr-review-resolution-loop` now have a hard Core Rule prohibiting rescue
  agent spawns while the original agent is still running. The coordinator
  must confirm termination before any rescue action.
- **Nudge-before-rescue progression**: the coordinator progress/rescue policy
  in `parallel-implementation-loop` now follows an 8-step progression
  requiring a mandatory continuation nudge before entering rescue. The
  minimum stall-check threshold is raised from 2 to 3 (configurable via
  `concurrency.rescue-min-stall-checks`).
- **Stricter rescue in review resolution**: `pr-review-resolution-loop`
  rescue policy now requires 3 consecutive checks with no progress, a
  mandatory nudge, and same-agent continuation before considering a
  replacement agent.
- **Convergence rules tightened**: repeated review issues in
  `parallel-implementation-loop` now route to re-scope instead of rescue.
- **Version sync**: umbrella and workflow-orchestration bumped from 2.1.2 to
  2.2.0 across all manifests, packages, and marketplace metadata.

## [2.1.2] - 2026-04-14

### Changed (workflow-orchestration 2.1.2)

- **Rescue-policy reduction**: `parallel-implementation-loop` and
  `swarm-orchestration` now treat soft budgets as advisory only, require real
  stall evidence before entering rescue, prefer same-agent continuation in the
  existing worktree or domain context, and avoid spawning duplicate narrowed-
  scope rescue agents by default.
- **Convergence and delivery guidance**: the workflow README, usage guide, and
  plugin contract tests now document and enforce the same-agent-first stall
  policy so large or slow tasks are escalated or stopped with preserved partial
  progress instead of reflexively launching inferior duplicate rescue passes.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `2.1.1` to `2.1.2` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [2.1.1] - 2026-04-13

### Changed (workflow-orchestration 2.1.1)

- **PR review resolution hardening**: `pr-review-resolution-loop` now treats
  every comment as a hypothesis until verified, records an evidence verdict
  separately from the action, requires reply-plus-resolve thread handling, and
  defaults to commit/push plus a brief developer-facing summary when the branch
  changed.
- **Readiness and model-default behavior**:
  `final-pr-readiness-gate` now verifies PR-scope continuity from the evidence
  already on the PR before escalating to the developer, and the affected skills
  now use baked-in model defaults silently when project config and session cache
  are absent.
- **Parallel implementation loop hardening**:
  `parallel-implementation-loop`, the workflow README, and the workflow usage
  guide now require integration feature branches, isolated external worktrees
  per implementer track, commit-and-push completion through PR publication by
  default, and concise quality cues including TDD, DRY, SOLID-where-it-fits,
  and low-complexity control flow plus advisory `clean-code-codex` checks when
  available.
- **Structural coverage**: the workflow plugin test suite now validates the new
  parallel-loop worktree, completion-through-publication, and quality-guidance
  contract, plus the skeptical review-resolution, evidence-first readiness, and
  silent model-default behavior introduced across the affected workflows.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `2.1.0` to `2.1.1` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [2.1.0] - 2026-04-10

### Added (workflow-orchestration 2.1.0)

- **Idea-to-done closeout contract**: `idea-to-done-orchestration` now carries
  trusted published work through merge-aware closeout, release-aware vs
  non-release-aware routing, optional knowledge capture or refresh, and a
  durable completion summary without becoming a post-merge mega-skill.
- **Completion summary template**:
  `plugins/workflow-orchestration/docs/workflow-artifact-templates.md` now
  defines a durable `Completion summary` artifact for shipped outcome, merge
  status, release disposition, knowledge steps, unresolved follow-ups, and
  final next action.

### Changed (workflow-orchestration 2.1.0)

- **Closeout state and session-boundary docs**:
  `plugins/workflow-orchestration/docs/workflow-state-contract.md`,
  `plugins/workflow-orchestration/docs/session-md-schema.md`, the workflow
  README, and the workflow usage guide now document closeout-owned state
  boundaries, stale-state handling for merge and release evidence, and the rule
  that `.workflow-orchestration/state.json` remains authoritative while
  `.agent/SESSION.md` and `.agent/HANDOFF.json` stay advisory only.
- **Structural coverage**: the workflow plugin test suite now validates
  merge-aware closeout language, release-entry and release-skip boundaries,
  completion-summary expectations, and the conductor's coordinator-shaped
  post-merge routing.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `2.0.0` to `2.1.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [2.0.0] - 2026-04-10

### Added (workflow-orchestration 2.0.0)

- **`knowledge-refresh` skill**: adds a bounded maintenance workflow for
  classifying reusable knowledge as trusted, stale, duplicate, obsolete,
  superseded, or missing-capture, then preserving one canonical guidance path
  without replacing `knowledge-compound`.
- **Refresh summary template**: adds a shared durable artifact shape for refresh
  runs in `plugins/workflow-orchestration/docs/workflow-artifact-templates.md`
  so maintenance passes can record candidate classifications, decisions,
  affected artifacts, reuse-quality findings, rescue history, and next action.

### Changed (workflow-orchestration 2.0.0)

- **Refresh-aware reuse quality**: `planning-orchestration` and
  `diff-review-orchestration` now prefer canonical refreshed artifacts when
  metadata exists and fall back cleanly to advisory lookup when it does not.
- **Refresh lifecycle docs**: the workflow README, usage guide, and
  `workflow-state-contract.md` now document optional refresh routing, refresh
  state boundaries, and the distinction between capture and maintenance.
- **Structural coverage**: the workflow plugin test suite now validates the new
  refresh skill contract, refresh summary template, refresh-aware prior-learning
  lookup language, and optional conductor refresh recommendation.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `1.9.0` to `2.0.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [1.9.0] - 2026-04-10

### Added (workflow-orchestration 1.9.0)

- **Continuation contract for `idea-to-done-orchestration`**: the conductor
  now documents trusted-state continuation intake, one next-ready decision
  matrix, stale-state rejection rules, and explicit resume examples for review
  resolution, failed readiness, and publish-waiting-human boundaries while
  staying coordinator-shaped.
- **Continuation state-boundary contract**: `plugins/workflow-orchestration/docs/workflow-state-contract.md`
  now defines continuation trust checks, resume boundary expectations,
  stale-state/change-tree detection, and the boundary-write rules needed for
  safe lifecycle resumption.

### Changed (workflow-orchestration 1.9.0)

- **Product docs and structural coverage**: the workflow README, usage guide,
  session-boundary schema docs, and plugin test suite now treat continuation as
  a shipped conductor capability and reinforce `.workflow-orchestration/state.json`
  as the durable authority over advisory session files.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `1.8.0` to `1.9.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [1.8.0] - 2026-04-10

### Added (workflow-orchestration 1.8.0)

- **`idea-to-done-orchestration` skill**: adds the first opt-in full-loop
  conductor for clarified work. It stays coordinator-shaped, supports
  `manual`/`guided`/`auto` progression, routes to the existing specialist
  workflows, and records durable workflow-state updates at major owned phase
  boundaries instead of reimplementing those downstream phases.
- **Conductor lifecycle summary template**: adds a shared `Conductor lifecycle
  summary` artifact contract to
  `plugins/workflow-orchestration/docs/workflow-artifact-templates.md` so the
  top-level workflow can leave behind one durable lifecycle handoff or final
  summary in addition to `.workflow-orchestration/state.json`.

### Changed (workflow-orchestration 1.8.0)

- **Start-here product docs**: the workflow README, usage guide, root README,
  and roadmap now expose the whole-loop conductor as the obvious top-level
  entry path for clarified work while keeping manual specialist entry valid.
- **Structural coverage**: the workflow plugin test suite now validates the new
  conductor contract, state-update references, progression modes, stop
  boundaries, and conductor summary template.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `1.7.0` to `1.8.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [1.7.0] - 2026-04-10

### Added (workflow-orchestration 1.7.0)

- **Direct execution contract**: `delivery-orchestration` now documents the
  direct lane as a first-class contract with explicit accepted inputs,
  forwarded context, validation expectations, durable-output requirements, and
  stop conditions instead of a thin runtime placeholder.
- **Direct execution outcome report**: `docs/workflow-artifact-templates.md`
  now defines a dedicated direct-execution artifact template, including the
  normalized `Validation outcome: pass | fail | partial | not-run` tokens and
  the review-handoff payload expected by downstream review.

### Changed (workflow-orchestration 1.7.0)

- **Normalized post-delivery review handoff**: `delivery-orchestration` and
  `diff-review-orchestration` now align on one direct-path handoff shape —
  diff surface, validation outcome, delivery-context artifact reference, and
  mode suggestion — so direct delivery is as inspectable as the parallel and
  swarm routes.
- **Direct-path rescue and reroute policy**: `delivery-orchestration` now
  defines explicit rescue behavior for misclassified direct work, including
  when to narrow scope, reroute to parallel/swarm/debugging, or return to
  planning.
- **Product docs and structural coverage**: the workflow README, usage guide,
  and plugin test suite now treat the direct lane as a first-class documented
  product surface rather than an implicit implementation detail.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `1.6.0` to `1.7.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [1.6.0] - 2026-04-09

### Added (workflow-orchestration 1.6.0)

- **Shared workflow defaults contract**: adds
  `plugins/workflow-orchestration/docs/workflow-defaults-contract.md`, defining
  the repo-level defaults file, key groups, fallback behavior, override
  precedence, artifact sink normalization, and automation guardrails for later
  lifecycle automation.
- **Durable workflow-state contract**: adds
  `plugins/workflow-orchestration/docs/workflow-state-contract.md`, defining the
  canonical `.workflow-orchestration/state.json` artifact, required fields,
  ownership boundaries, stale-state handling, and explicit separation from
  transient session continuity.
- **Workflow usage guide**: adds
  `plugins/workflow-orchestration/docs/workflow-usage-guide.md` as a product
  guide for the composed loops plus the new defaults/state foundation.

### Changed (workflow-orchestration 1.6.0)

- **Defaults adoption in core workflows**: `planning-orchestration`,
  `diff-review-orchestration`, `pr-publish-orchestration`, and
  `knowledge-compound` now document how they consult shared defaults when
  present and fall back cleanly when the defaults file is absent or partial.
- **Session continuity boundary**: `docs/session-md-schema.md` now explicitly
  distinguishes transient `.agent/SESSION.md` / `.agent/HANDOFF.json` continuity
  from durable workflow lifecycle state in `.workflow-orchestration/state.json`.
- **Product docs and structural coverage**: the workflow README and plugin test
  suite now cover the defaults/state foundation docs, the initial adopting
  workflows, and the new usage-guide surface.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `1.5.0` to `1.6.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [1.5.0] - 2026-04-09

### Added (workflow-orchestration 1.5.0)

- **`pr-publish-orchestration` skill**: adds a thin publication bridge that
  accepts ready-to-publish work, performs commit/push/PR creation or update,
  and explicitly deflects release-shaped requests to
  `release-orchestration`.
- **Publish summary template**: adds a shared `Publish summary` artifact
  contract to `docs/workflow-artifact-templates.md`, including the suggested
  `.workflow-orchestration/artifacts/publish-summary-<topic>.md` sink for local
  publication records.
- **Headless review mode**: `diff-review-orchestration` now documents a third
  `headless` mode for non-interactive review environments and records a
  self-contained review artifact with an explicit stopped state when downstream
  human confirmation is unavailable.

### Changed (workflow-orchestration 1.5.0)

- **Bounded autofix decision**: `diff-review-orchestration` now records an
  explicit defer decision for autofix plus the guardrails required before
  future shipment.
- **Start-here workflow docs**: the workflow README now presents the default
  path as planning -> delivery -> diff review -> review resolution -> final
  readiness -> PR publish, while keeping release management under
  `release-orchestration`.
- **Structural coverage**: workflow plugin tests now assert the new
  `pr-publish-orchestration` boundary contract, the shared publish-summary
  template, and the bounded headless/autofix review surface.
- **Runtime verifier hardening**: the umbrella runtime checker now tolerates a
  Copilot CLI uninstall anomaly for isolated `sdd-workflow` config dirs after
  install/list/load verification succeeds, so full runtime validation can
  complete reliably.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata
  bumped from `1.4.0` to `1.5.0` across the root package, lockfile, workflow
  package/manifests, and marketplace metadata.

## [1.4.0] - 2026-04-09

### Added (workflow-orchestration 1.4.0)

- **`delivery-orchestration` skill**: adds a thin delivery router that classifies
  execution-ready requests, chooses between direct implementation, parallel tracks,
  swarm orchestration, or systematic debugging, and deflects planning-, review-, and
  release-shaped work to the correct upstream or downstream workflow.
- **Default post-delivery handoffs**: `delivery-orchestration` now documents
  `diff-review-orchestration` as the standard follow-up for any non-empty delivered
  diff and `knowledge-compound` as the conditional follow-up when reviewed delivery
  work produces a durable reusable lesson.
- **Coordinator-boundary coverage**: workflow plugin tests now assert that
  `delivery-orchestration` keeps explicit planning/release deflection rules and
  no-planning/no-release coordinator invariants.

### Changed (workflow-orchestration 1.4.0)

- **Delivery loop docs**: the workflow README now presents the default path as
  planning -> delivery -> diff review -> knowledge capture, and includes
  `delivery-orchestration` in the published skill list.
- **Version sync**: workflow-orchestration and umbrella marketplace metadata bumped from
  `1.3.0` to `1.4.0` across the root package, workflow plugin manifests, and marketplace
  metadata.
- **Description update**: workflow-orchestration descriptions now include "delivery
  orchestration" across the synced plugin and marketplace manifests.

## [1.3.0] - 2026-04-08

### Added (workflow-orchestration 1.3.0)

- **`knowledge-compound` skill**: captures reusable knowledge from completed workflows
  — problem, signals, resolution, guardrails, and applicability — and writes it to a
  durable, repository-appropriate sink. Integrates with the shared knowledge artifact
  template in `plugins/workflow-orchestration/docs/workflow-artifact-templates.md`.
- **Prior-learning reuse in `diff-review-orchestration`**: the diff review workflow now
  looks up knowledge artifacts whose applicability overlaps with the reviewed diff and
  surfaces matching learnings as advisory context before downstream checks run.
- **Prior-learning reuse in `planning-orchestration`**: planning discovery can consult
  prior knowledge artifacts to inform scope decisions and surface known risks.
- **Shared template alignment**: added `Prior-learnings consulted` field to the discovery
  brief template and `prior-learnings` outcome measure to the workflow outcome measures
  contract so all prior-learning-aware skills record lookup results consistently.

### Changed (workflow-orchestration 1.3.0)

- **Version sync**: workflow-orchestration and umbrella marketplace metadata bumped from
  `1.2.0` to `1.3.0` across the root package, workflow plugin manifests, and marketplace
  metadata.
- **Description update**: workflow-orchestration description now includes "knowledge
  capture" across all synced manifests.

## [1.2.0] - 2026-04-08

### Added (workflow-orchestration 1.2.0)

- **`diff-review-orchestration` skill**: coordinates a structured diff review by routing
  to codex checks, readiness assessment, and review-resolution so review findings can
  move through one reusable workflow.
- **`git-worktree-orchestration` skill**: manages git worktree lifecycle for parallel
  implementation tracks with explicit setup, validation, and cleanup guidance.

### Changed (workflow-orchestration 1.2.0)

- **Version sync**: workflow-orchestration and umbrella marketplace metadata bumped from
  `1.1.0` to `1.2.0` across the root package, workflow plugin manifests, lockfile, and
  marketplace metadata.

## [1.1.0] - 2026-04-04

### Added (workflow-orchestration 1.1.0)

- **HANDOFF.json machine-readable session state**: companion to `.agent/SESSION.md`.
  Full schema documented in `plugins/workflow-orchestration/docs/session-md-schema.md`. Writer/reader rules added to
  `.claude/hooks/session-start.md` and `.github/copilot-instructions.md`. Absent or
  malformed `SESSION.md` now routes through HANDOFF.json fallback before proceeding
  normally. `.agent/HANDOFF.json` added to `.gitignore`.

### Added (clean-code-codex 1.3.0)

- **`resilience-check` sub-skill** (RESILIENCE-1–4): detects missing retry/backoff
  (BLOCK), absent circuit breakers, unbounded timeouts, and missing Go deadline
  propagation. Scoped to HTTP/network calls in TypeScript, JavaScript, Python, and Go.
- **`a11y-check` sub-skill** (A11Y-1–5): detects missing alt text on `<img>`/`<Image>`
  (BLOCK), non-semantic HTML, missing ARIA roles, inaccessible keyboard targets, and
  unlabeled form inputs. TSX/JSX only.
- **`docs-check` sub-skill** (DOCS-1–3): detects missing JSDoc/docstrings on public
  symbols (TypeScript, JavaScript, Python), stale inline comments, and missing
  top-level README. Does not overlap with `dead-check`.
- **`i18n-check` sub-skill** (I18N-1–3): detects hardcoded user-visible strings,
  locale-unaware date/number formatting, and missing translation keys. Config-aware:
  flat-key (`keySeparator: false`) and nested key stores handled correctly.
- **`ctx-check` sub-skill** (CTX-1–3): language-agnostic context hygiene. Warns on
  stale/absent session state, exceeded failed-hypothesis budget (≥3), and missing
  codebase brief before non-trivial implementation tasks.
- **Conductor dispatch table updated**: all five new sub-skills wired into `write`,
  `review`, and `new-service` operations.

### Fixed (workflow-orchestration 1.1.0)

- **`parallel-implementation-loop` pre-flight gate**: added Step 3 requiring all
  worktrees to be created before any agent launches. Prevents the race condition where
  parallel agents share a working tree. Worktree path is now a required input and a
  required field in every implementer agent prompt.

## [1.0.0] - 2026-04-04

### Added (workflow-orchestration 1.0.0)

- **`contract-generator` skill**: derives machine-readable contracts from a `spec.md` or
  natural-language endpoint description. Emits `openapi.yaml` (OpenAPI 3.x) with `x-fr-id`
  annotations, `schema/{EntityName}.json` (JSON Schema draft-07/2020-12) per domain entity,
  and `features/{feature-name}.feature` (Gherkin) per acceptance scenario. Produces a
  durable `contracts-summary.md` artifact recording FR-ID mapping results and any
  low-confidence extractions. Integrates between `sdd.specify` and `sdd.plan` in the SDLC
  flow. Output defaults to `.sdd/{feature-dir}/contracts/`.
- **`release-orchestration` skill**: automates the full release pipeline — conventional
  commit semver calculation (`feat:` → minor, `fix:` → patch, breaking footer → major),
  `CHANGELOG.md` update in the project's existing dated-section format, git tag creation,
  and optional GitHub release creation. Supports explicit `--version` override and
  `--create-release` flag. Emits a durable `release-summary.md` artifact at every
  invocation. Duplicate-tag detection halts the skill before any state mutation.
- **Version sync**: workflow-orchestration bumped from `0.9.0` to `1.0.0` across all five
  manifest and marketplace files (`plugin.json`, `.claude-plugin/plugin.json`,
  `package.json`, `.github/plugin/marketplace.json`, `.claude-plugin/marketplace.json`).
  Umbrella `metadata.version` updated to `1.0.0`.

## [0.9.0] - 2026-04-03

### Added (workflow-orchestration 0.9.0)

- **`incident-rca` skill**: structured production incident triage with 4-phase workflow —
  Hypothesis (service-context gathering, ranked candidate list), Reproduce (staging/canary
  confirmation or degraded-mode declaration), Isolate (narrow to component/line with
  evidence), Fix + Verify (implement, validate, confirm symptom resolved). Produces a durable
  RCA summary artifact at every invocation (complete or partial). Distinct from
  `systematic-debugging` (general sessions); targets live alerts, on-call pages, and
  SLA-impacting failures.
- **`e2e-test-generation` skill**: scaffolded E2E test generation for integration seams —
  REST endpoints, UI flows, and service boundaries. Auto-detects E2E framework from
  package.json / pyproject.toml / go.mod (Playwright, Cypress, pytest, httptest, etc.).
  Generates happy-path + error-boundary + auth-boundary scaffolds with per-language naming
  conventions. Falls back to framework-agnostic stubs with setup instructions when no
  framework is detected. Produces a durable scaffold generation summary.

### Added (clean-code-codex 1.2.0)

- **`iac-check` sub-skill**: IaC security analysis for Terraform HCL, CloudFormation
  YAML/JSON, and Kubernetes manifests. Detects five rule classes: IAC-1 public storage
  buckets, IAC-2 containers running as root, IAC-3 missing encryption-at-rest, IAC-4
  wildcard IAM policies, IAC-5 exposed ports in security groups. Wired into the conductor's
  `security` and `review` operations. Unsupported IaC dialects (Pulumi, CDK, Bicep) are
  skipped gracefully.
- **`perf-check` sub-skill**: static performance analysis for TypeScript, JavaScript, Python,
  Go, and Rust. Detects three rule classes: PERF-1 N+1 query patterns (queries inside loops),
  PERF-2 unbounded loops over collections (no limit/pagination guard), PERF-3 missing
  pagination on list endpoints. Wired into the conductor's `review` operation.
- **`verification` hook**: graduates verification-before-completion from instruction pattern
  to an actively enforced PostToolUse gate. Fires on Write/Edit events, checks whether the
  repository's validation suite has been run since the last code change. Blocks with guidance
  when validation is overdue; passes silently when current; warns (non-blocking) when no
  validation config is found.

## [0.8.0] - 2026-04-03

### Added

- **D1 — `map-codebase` skill**: guided codebase discovery producing a structured, factual
  context brief across 5 parallel discovery dimensions (structure, dependencies, tests,
  architecture, hotspots). Records `brief-path` in SESSION.md `## Decisions` for downstream
  skill consumption.
- **D2 — `architecture-review` skill**: structured architecture analysis using ARCH-1 through
  ARCH-6 as the analytical framework (layer violations, circular imports, missing public API,
  dependency direction, god modules, abstraction boundaries). Consumes `map-codebase` output
  via `brief-path` when available. Integrates with `clean-code-codex` `arch-check` skill.
- **D3 — `brainstorm-ideation` skill**: pre-spec Socratic ideation skill that surfaces
  constraints, trade-offs, and risks before the developer is ready for formal specification.
  5-step dialogue with reviewer sanity-check gate; hands off to `sdd.specify` when ready.
- All 3 new skills include: `## Default Roles` with model-selection priority chain and
  6-row defaults table, full-schema SESSION.md write-points, and binary PASS/FAIL
  verification checklists.

## [0.7.0] - 2026-04-04

### Added

- **D1 — Verification-Before-Completion**: added explicit binary verification checklists to the `## Required Gates` section of all 6 `workflow-orchestration` skills (`planning-orchestration`, `parallel-implementation-loop`, `pr-review-resolution-loop`, `final-pr-readiness-gate`, `swarm-orchestration`, `systematic-debugging`). Each checklist uses PASS / FAIL binary conditions and explicitly blocks completion on any failing item — preventing false-positive "done" declarations
- **D2 — Session-Start Hook + SESSION.md**: added session continuity infrastructure for both Claude Code and Copilot CLI:
  - `plugins/workflow-orchestration/docs/session-md-schema.md`: canonical SESSION.md schema reference with YAML frontmatter spec, five required markdown sections (`## Decisions`, `## Files Touched`, `## Open Questions`, `## Blockers`, `## Failed Hypotheses`), writer rules, and reader rules including DO-NOT-RETRY semantics for `## Failed Hypotheses`
  - `.claude/hooks/session-start.md`: working Claude Code session-start hook that announces session state, surfaces active blockers, and handles malformed files gracefully
  - `.github/copilot-instructions.md` session continuity section: equivalent Copilot CLI behavior (absent / valid / malformed branches)
  - SESSION.md write points added to `planning-orchestration` (after requirements confirmed), `parallel-implementation-loop` (per-track merged), `pr-review-resolution-loop` (triage complete + per fix-batch complete), and `swarm-orchestration` (per topology-phase converged)
  - `.gitignore` exclusion for `.agent/SESSION.md` (runtime artifact, not version-controlled)
- **D3 — Systematic Debugging Skill**: new `systematic-debugging` skill with four structured phases (hypothesis → reproduce → isolate → fix), mandatory context-hygiene pause-and-resume after `max-failed-attempts` (default: 3) failed hypotheses, DO-NOT-RETRY enforcement for `## Failed Hypotheses`, SESSION.md writes at all five phase boundaries, and durable debugging summary requirement

### Changed

- bumped `workflow-orchestration` plugin, umbrella package, and all marketplace manifests to `0.7.0`

## [0.6.0] - 2026-04-02

### Added

- new `swarm-orchestration` skill in `workflow-orchestration`: dynamic runtime topology selection (coordinator-worker, pipeline, wave/batch, hierarchical, mesh), SWARM.md shared knowledge base lifecycle (create → update → archive/delete), five-role model selection (coordinator, scout, domain, synthesizer, reviewer), three token budget modes (`minimal` / `standard` / `deep`), bounded convergence rounds, rescue policy, and durable swarm summary artifact gate
- `docs/competitor-comparison.md`: full feature comparison of `agent-orchestration` against Superpowers and GSD with eight mermaid diagrams (architecture, workflow, coverage matrix, gap analysis, auto-trigger behavior, installation experience, roadmap, plugin composition)
- `docs/swarm-orchestration.md`: swarm orchestration research reference with eight mermaid diagrams (five topologies, system-to-topology map, gap analysis, token cost curves, model selection decision tree, failure modes, proposed skill flow, decision guide)

### Changed

- bumped `workflow-orchestration` plugin, umbrella package, and all marketplace manifests to `0.6.0`
- broadened root `package.json` `files` allowlist from three specific doc entries to `docs/` so all current and future docs ship in the published package
- synced `workflow-orchestration` description across both marketplace manifests to include "swarm orchestration"

## [0.5.0] - 2026-04-02

### Added

- umbrella marketplace groundwork for `agent-orchestration`, including a companion `plugins/sdd-workflow/` bundle and a new `planning-orchestration` skill
- umbrella docs for marketplace overview, install guidance, and companion-plugin composition
- vendored `plugins/clean-code-codex/` as a third separate marketplace bundle with its current skills, scripts, command, agent, and hooks

### Changed

- renamed the root plugin identity from `agent-workflow-skills` to `workflow-orchestration`
- updated marketplace metadata to expose both `workflow-orchestration` and `sdd-workflow`
- moved `workflow-orchestration` into `plugins/workflow-orchestration/` and converted the repo root to umbrella-only marketplace, docs, and validation infrastructure
- bumped the shared package, plugin manifests, and marketplace metadata to `0.5.0`

## [0.4.0] - 2026-04-02

### Added

- scout/discovery guidance, factual-brief handoffs, and cheap-model routing support across all three shared workflow skills
- progress-based rescue policies, bounded resend loops, convergence rules, and workflow outcome-measure recording
- stronger structural assertions in `test/plugin-layout.test.js` for required protocol language in each `SKILL.md`

### Changed

- promoted durable workflow artifacts from advisory guidance to required gate conditions and expanded `docs/workflow-artifact-templates.md` with state and outcome fields
- updated `docs/coordinator-subagent-recommendations.md` and `docs/skills-evaluation.md` to reflect the implemented throughput improvements and out-of-scope persistent-team guidance
- bumped the shared package, plugin manifests, and marketplace metadata to `0.4.0`
- stopped tracking `.sdd/` planning artifacts in git and added `.sdd/` to `.gitignore`

## [0.3.0] - 2026-03-30

### Added

- optional Fleet / Claude Code agent-team escalation guidance across the shared workflow skills, with explicit cost-aware opt-in instead of making team orchestration the default
- explicit Azure DevOps PR discussion guidance in the review-resolution workflow and artifact template

### Changed

- bumped the shared package, plugin manifests, and marketplace metadata to `0.3.0`

## [0.2.0] - 2026-03-25

### Added

- `CONTRIBUTING.md` with repo-specific contributor guidance
- `CLAUDE.md` with Claude Code specific repository instructions
- `.claude-plugin/marketplace.json` and supporting test coverage for Claude marketplace packaging
- `docs/models-config-template.md` with ready-to-copy Copilot and Claude model override examples
- `docs/workflow-artifact-templates.md` with canonical templates for track reports, review-resolution summaries, and readiness reports
- `scripts/verify-runtime.mjs` and `npm run validate:runtime` for isolated Copilot install/list/uninstall and real plugin loading checks in both Copilot CLI and Claude Code
- stronger test coverage for manifest sync, required skill sections, and packaged artifact contents

### Changed

- strengthened the shared skill docs with examples, stop conditions, stronger TDD language, and per-role model selection guidance
- expanded `README.md` and `.github/copilot-instructions.md` with validation, packaging, and runtime-verification guidance
- updated `docs/skills-evaluation.md` to track completed and remaining recommendations
- aligned the shared package, plugin manifests, and marketplace metadata for the `0.2.0` release

## [0.1.0] - 2026-03-18

### Added

- initial shared plugin structure for GitHub Copilot CLI and Claude Code
- shared `skills/` tree with:
  - `parallel-implementation-loop`
  - `pr-review-resolution-loop`
  - `final-pr-readiness-gate`
- Copilot manifest, Claude manifest, marketplace metadata, and validation workflow
