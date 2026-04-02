# Copilot Instructions

## Validation commands

- Use Node 22 or newer. The repo is ESM-only and the root and plugin package manifests declare `node >=22.0.0`.
- Install dependencies with `npm install`.
- Run the full validation suite with `npm run validate:plugin` or `npm test`. The root suite runs the umbrella tests and the nested workflow plugin tests.
- Run local runtime verification with `npm run validate:runtime`. It performs isolated Copilot install/list/uninstall checks and real plugin-load checks for both `workflow-orchestration` and `sdd-workflow` in both Copilot CLI and Claude Code, so it requires authenticated CLIs and may consume model requests.
- Run the umbrella-only test file with `node --test test/umbrella-layout.test.js`.
- Run the workflow plugin test file with `node --test plugins/workflow-orchestration/test/plugin-layout.test.js`.

## High-level architecture

- This repository is an umbrella marketplace repo for both GitHub Copilot CLI and Claude Code.
- `plugins/workflow-orchestration/skills/*/SKILL.md` is the single source of truth for the workflow-orchestration skills.
- `plugins/workflow-orchestration/plugin.json` and `plugins/workflow-orchestration/.claude-plugin/plugin.json` are the workflow plugin manifests.
- `.github/plugin/marketplace.json` and `.claude-plugin/marketplace.json` are umbrella marketplace metadata for distributing multiple plugins from one repo.
- `test/umbrella-layout.test.js` verifies the umbrella package and marketplace layout.
- `plugins/workflow-orchestration/test/plugin-layout.test.js` verifies the workflow plugin manifests, package contents, and required structure inside each workflow `SKILL.md`.
- `.github/workflows/validate-plugin.yml` runs the same Node test suite in CI on `main`, `feat/**`, and `fix/**`.

## Repository-specific conventions

- Keep the repository plugin-first. Changes to workflow skill behavior usually belong in `plugins/workflow-orchestration/skills/*/SKILL.md`; marketplace metadata should only change when bundle identity or packaging changes.
- Keep `plugins/workflow-orchestration/plugin.json` and `plugins/workflow-orchestration/.claude-plugin/plugin.json` synchronized for shared identity fields such as `name`, `version`, and `description`. The workflow plugin test suite expects them to match.
- Preserve the shared workflow skill path convention: Copilot uses `"skills": ["skills/"]`, while Claude uses `"skills": "./skills/"`.
- Every skill file must keep the tested SKILL.md shape: YAML frontmatter with `name` and `description`, plus the required sections including `## Purpose` and `## Project-Specific Inputs`.
- Write skill content in repo-agnostic workflow language. The skills are meant to be reusable across repositories, so avoid baking in project-specific branch names, validation commands, or Hydra-specific assumptions.
- When extending a skill, keep the separation of responsibilities intact: implementation parallelism, review-resolution, and final readiness are modeled as three separate skills rather than one combined workflow.
- Prefer plugin-qualified invocation names in docs and examples, such as `/workflow-orchestration:parallel-implementation-loop`, because the README treats plugin namespacing as the normal usage pattern.
