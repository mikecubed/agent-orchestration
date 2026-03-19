# Copilot Instructions

## Validation commands

- Use Node 22 or newer. The repo is ESM-only and `package.json` declares `node >=22.0.0`.
- Install dependencies with `npm install`.
- Run the full validation suite with `npm run validate:plugin` or `npm test`. Both execute `node --test test/**/*.test.js`.
- Run local runtime verification with `npm run validate:runtime`. It performs an isolated Copilot install/list/uninstall check and a real plugin-load check in both Copilot CLI and Claude Code, so it requires authenticated CLIs and may consume model requests.
- Run the single test file with `node --test test/plugin-layout.test.js`.
- Run a single named test with `node --test --test-name-pattern "plugin manifests" test/plugin-layout.test.js`.

## High-level architecture

- This repository is a shared plugin repo for both GitHub Copilot CLI and Claude Code. The core product is the shared `skills/` tree, not compiled application code.
- `skills/*/SKILL.md` is the single source of truth for the three workflow skills: `parallel-implementation-loop`, `pr-review-resolution-loop`, and `final-pr-readiness-gate`.
- `plugin.json` is the GitHub Copilot CLI manifest. `.claude-plugin/plugin.json` is the Claude Code manifest. They describe the same plugin identity and both point at the shared `skills/` directory.
- `.github/plugin/marketplace.json` is marketplace metadata for distributing the Copilot plugin. Treat it as distribution metadata layered on top of the runtime manifests, not as the source skill definition.
- `test/plugin-layout.test.js` is the main enforcement point. It verifies the Copilot manifest, Claude manifest, marketplace metadata, and required structure inside each `SKILL.md`.
- `.github/workflows/validate-plugin.yml` runs the same Node test suite in CI on `main`, `feat/**`, and `fix/**`.

## Repository-specific conventions

- Keep the repository plugin-first. Changes to skill behavior usually belong in `skills/*/SKILL.md`; manifest files and marketplace metadata should only change when plugin identity or packaging changes.
- Keep `plugin.json` and `.claude-plugin/plugin.json` synchronized for shared identity fields such as `name`, `version`, and `description`. The test suite expects them to match.
- Preserve the shared skill path convention: Copilot uses `"skills": ["skills/"]`, while Claude uses `"skills": "./skills/"`.
- Every skill file must keep the tested SKILL.md shape: YAML frontmatter with `name` and `description`, plus the required sections including `## Purpose` and `## Project-Specific Inputs`.
- Write skill content in repo-agnostic workflow language. The skills are meant to be reusable across repositories, so avoid baking in project-specific branch names, validation commands, or Hydra-specific assumptions.
- When extending a skill, keep the separation of responsibilities intact: implementation parallelism, review-resolution, and final readiness are modeled as three separate skills rather than one combined workflow.
- Prefer plugin-qualified invocation names in docs and examples, such as `/agent-workflow-skills:parallel-implementation-loop`, because the README treats plugin namespacing as the normal usage pattern.
