# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository role

This repository is an umbrella marketplace repo for **GitHub Copilot CLI** and **Claude Code** plugins. The `workflow-orchestration` plugin now lives under `plugins/workflow-orchestration/`, and `sdd-workflow` lives under `plugins/sdd-workflow/`.

## Validation commands

- Use Node 22 or newer.
- Install dependencies with `npm install`.
- Run umbrella validation with `npm test` or `npm run validate:plugin`.
- Run runtime verification with `npm run validate:runtime`. This performs isolated install/list/uninstall checks and session-only plugin loading checks for both plugin bundles in Copilot CLI and Claude Code.
- Run the umbrella-only test file with `node --test test/umbrella-layout.test.js`.
- Run the workflow plugin test file with `node --test plugins/workflow-orchestration/test/plugin-layout.test.js`.

## Architecture

- `.github/plugin/marketplace.json` and `.claude-plugin/marketplace.json` are the umbrella marketplace manifests.
- `plugins/workflow-orchestration/` contains the workflow plugin package, manifests, shared skills, tests, and plugin-local docs.
- `plugins/sdd-workflow/` contains the vendored SDD companion plugin bundle.
- `test/umbrella-layout.test.js` enforces the umbrella marketplace/package layout.
- `plugins/workflow-orchestration/test/plugin-layout.test.js` enforces the workflow plugin manifests, skill contract, and package contents.
- `scripts/verify-runtime.mjs` performs real runtime verification against the installed CLIs for both plugin bundles.

## Repository-specific conventions

- Keep umbrella docs at the repo root and plugin-specific docs inside the relevant plugin directory.
- Keep shared identity metadata aligned across `plugins/workflow-orchestration/package.json`, `plugins/workflow-orchestration/plugin.json`, and `plugins/workflow-orchestration/.claude-plugin/plugin.json`.
- Both marketplace files must point at `plugins/workflow-orchestration` and `plugins/sdd-workflow` correctly.
- Preserve the intentional path difference for workflow-orchestration: Copilot uses `["skills/"]`; Claude uses `"./skills/"`.
- Every workflow skill must keep the tested shape, including frontmatter with `name` and `description`, plus `## Purpose`, `## When to Use It`, `## Project-Specific Inputs`, `## Workflow`, `## Required Gates`, `## Stop Conditions`, and an example section.
- The workflow plugin test file (`plugins/workflow-orchestration/test/plugin-layout.test.js`) hardcodes the workflow skill names. Adding a new workflow skill requires adding it there as well as to both workflow manifests.
- Keep skill content repo-agnostic and reusable across repositories.
- Preserve the three-skill split: implementation parallelism, review resolution, and final readiness are separate workflows.
- Prefer plugin-qualified names in examples, such as `/workflow-orchestration:parallel-implementation-loop`.

## Local plugin usage

To load the workflow-orchestration plugin in Claude Code for the current session:

```bash
claude --plugin-dir ./plugins/workflow-orchestration
```

To check that Claude can see the plugin skills non-interactively:

```bash
claude -p --plugin-dir ./plugins/workflow-orchestration --output-format text "List the plugin-qualified skill names loaded from this plugin, one per line and nothing else."
```

Reload plugin changes in an interactive Claude session with:

```text
/reload-plugins
```
