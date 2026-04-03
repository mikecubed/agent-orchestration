# Changelog

All notable changes to this repository should be documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

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
