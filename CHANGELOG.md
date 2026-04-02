# Changelog

All notable changes to this plugin should be documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

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
