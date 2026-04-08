# Changelog

All notable changes to this repository should be documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

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
