# Changelog

All notable changes to this plugin should be documented in this file.

The format is based on Keep a Changelog and the project follows Semantic Versioning.

## [Unreleased]

### Added

- optional Fleet / Claude Code agent-team escalation guidance across the shared workflow skills, with explicit cost-aware opt-in instead of making team orchestration the default

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
