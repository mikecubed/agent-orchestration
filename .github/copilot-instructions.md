# Copilot Instructions

## Validation commands

- Use Node 22 or newer. The repo is ESM-only and the root and plugin package manifests declare `node >=22.0.0`.
- Install dependencies with `npm install`.
- Run the full validation suite with `npm run validate:plugin` or `npm test`. The root suite runs the umbrella tests and the nested flow, ccc, and patterns plugin tests.
- Run local runtime verification with `npm run validate:runtime`. It performs isolated Copilot install/list/uninstall checks and real plugin-load checks for `flow`, `ccc`, and `patterns` in both Copilot CLI and Claude Code, so it requires authenticated CLIs and may consume model requests.
- Run the umbrella-only test file with `node --test test/umbrella-layout.test.js`.
- Run the flow plugin test file with `node --test plugins/flow/test/plugin-layout.test.js`.
- Run the ccc plugin test file with `node --test plugins/ccc/test/plugin-layout.test.js`.
- Run the patterns plugin test file with `node --test plugins/patterns/test/plugin-layout.test.js`.

## High-level architecture

- This repository is an umbrella marketplace repo for both GitHub Copilot CLI and Claude Code.
- `plugins/flow/skills/*/SKILL.md` is the single source of truth for the flow skills. Flow also includes SDD agents in `plugins/flow/agents/`.
- `plugins/flow/plugin.json` and `plugins/flow/.claude-plugin/plugin.json` are the flow plugin manifests.
- `plugins/ccc/` contains the Clean Code Codex bundle and its plugin-local tests.
- `plugins/patterns/` contains the design patterns plugin (currently PEAA) with its skills and reference catalogs.
- `.github/plugin/marketplace.json` and `.claude-plugin/marketplace.json` are umbrella marketplace metadata for distributing multiple plugins from one repo.
- `test/umbrella-layout.test.js` verifies the umbrella package and marketplace layout.
- `plugins/flow/test/plugin-layout.test.js` verifies the flow plugin manifests, package contents, and required structure inside each flow `SKILL.md`.
- `.github/workflows/validate-plugin.yml` runs the same Node test suite in CI on `main`, `feat/**`, and `fix/**`.

## Repository-specific conventions

- Keep the repository plugin-first. Changes to workflow skill behavior usually belong in `plugins/flow/skills/*/SKILL.md`; marketplace metadata should only change when bundle identity or packaging changes.
- Keep `plugins/flow/plugin.json` and `plugins/flow/.claude-plugin/plugin.json` synchronized for shared identity fields such as `name`, `version`, and `description`. The flow plugin test suite expects them to match.
- Preserve the shared workflow skill path convention: Copilot uses `"skills": ["skills/"]`, while Claude uses `"skills": "./skills/"`.
- Every skill file must keep the tested SKILL.md shape: YAML frontmatter with `name` and `description`, plus the required sections including `## Purpose` and `## Project-Specific Inputs`.
- Write skill content in repo-agnostic workflow language. The skills are meant to be reusable across repositories, so avoid baking in project-specific branch names, validation commands, or Hydra-specific assumptions.
- When extending a skill, keep the separation of responsibilities intact: implementation parallelism, review-resolution, and final readiness are modeled as three separate skills rather than one combined workflow.
- Prefer plugin-qualified invocation names in docs and examples, such as `/flow:parallel-impl`, because the README treats plugin namespacing as the normal usage pattern.

## Session continuity — SESSION.md + HANDOFF.json

At the start of every session, check for `.agent/SESSION.md` in the project root.

- **If absent**: check for `.agent/HANDOFF.json` (see HANDOFF.json fallback below).
- **If present and valid**: within the first response turn, announce the session state —
  current task, current phase, next action, workspace. List active blockers. If blockers
  are non-empty, ask the developer whether they have been resolved before proceeding.
  If `.agent/HANDOFF.json` is also present, it is the machine-readable companion — no
  special action needed, it will be written alongside SESSION.md updates.
- **If present but malformed** (YAML parse error or missing required fields): report the
  parse failure, ignore the file, and check for `.agent/HANDOFF.json` as a fallback.

### HANDOFF.json fallback

When SESSION.md is absent or malformed, check for `.agent/HANDOFF.json`:

- **If absent**: proceed normally without mentioning it.
- **If present and valid JSON** with all required fields — 6 scalar fields (`schema-version`,
  `current-task`, `current-phase`, `next-action`, `workspace`, `last-updated`) present and
  of type string, and 5 array fields (`files-touched`, `open-questions`, `blockers`,
  `failed-hypotheses`, `decisions`) present and of type array: use it as the session
  state source — announce the session state in the same way as a valid SESSION.md.
  If `blockers` is non-empty, list the blockers and ask whether they have been resolved.
- **If present but malformed** (JSON parse failure, missing/wrong-type scalar fields, or
  missing/non-array array fields): report the parse failure, ignore the file, and
  proceed as if it were absent.

Schema reference: `plugins/flow/docs/session-md-schema.md`
