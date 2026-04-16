# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository role

This repository is an umbrella marketplace repo for **GitHub Copilot CLI** and **Claude Code** plugins. The `flow` plugin (workflow orchestration with integrated SDD) lives under `plugins/flow/`, `ccc` (clean-code enforcement) lives under `plugins/ccc/`, and `patterns` (PEAA, GoF, and DDD catalogs) lives under `plugins/patterns/`.

## Validation commands

- Use Node 22 or newer.
- Install dependencies with `npm install`.
- Run umbrella validation with `npm test` or `npm run validate:plugin`.
- Run runtime verification with `npm run validate:runtime`. This performs isolated install/list/uninstall checks and session-only plugin loading checks for both plugin bundles in Copilot CLI and Claude Code.
- Run the umbrella-only test file with `node --test test/umbrella-layout.test.js`.
- Run the flow plugin test file with `node --test plugins/flow/test/plugin-layout.test.js`.
- Run the ccc plugin test file with `node --test plugins/ccc/test/plugin-layout.test.js`.
- Run the patterns plugin test file with `node --test plugins/patterns/test/plugin-layout.test.js`.

## Architecture

- `.github/plugin/marketplace.json` and `.claude-plugin/marketplace.json` are the umbrella marketplace manifests.
- `plugins/flow/` contains the unified workflow + SDD plugin package, manifests, shared skills, tests, and plugin-local docs.
- `plugins/ccc/` contains the clean-code enforcement plugin bundle, including skills, command, agent, scripts, and hooks.
- `plugins/patterns/` contains the PEAA patterns plugin bundle.
- `test/umbrella-layout.test.js` enforces the umbrella marketplace/package layout.
- `plugins/flow/test/plugin-layout.test.js` enforces the flow plugin manifests, skill contract, and package contents.
- `scripts/verify-runtime.mjs` performs real runtime verification against the installed CLIs for all plugin bundles.

## Repository-specific conventions

- Keep umbrella docs at the repo root and plugin-specific docs inside the relevant plugin directory.
- Keep shared identity metadata aligned across `plugins/flow/package.json`, `plugins/flow/plugin.json`, and `plugins/flow/.claude-plugin/plugin.json`.
- Marketplace files must point at `plugins/flow`, `plugins/ccc`, and `plugins/patterns` correctly.
- Preserve the intentional path difference for flow: Copilot uses `["skills/"]`; Claude uses `"./skills/"`.
- Every workflow skill must keep the tested shape, including frontmatter with `name` and `description`, plus `## Purpose`, `## When to Use It`, `## Project-Specific Inputs`, `## Workflow`, `## Required Gates`, `## Stop Conditions`, and an example section.
- The flow plugin test file (`plugins/flow/test/plugin-layout.test.js`) hardcodes the workflow skill names. Adding a new workflow skill requires adding it there as well as to both flow manifests.
- Keep skill content repo-agnostic and reusable across repositories.
- Preserve the three-skill split: implementation parallelism, review resolution, and final readiness are separate workflows.
- Prefer plugin-qualified names in examples, such as `/flow:parallel-impl`.

## Local plugin usage

To load the flow plugin in Claude Code for the current session:

```bash
claude --plugin-dir ./plugins/flow
```

To check that Claude can see the plugin skills non-interactively:

```bash
claude -p --plugin-dir ./plugins/flow --output-format text "List the plugin-qualified skill names loaded from this plugin, one per line and nothing else."
```

Reload plugin changes in an interactive Claude session with:

```text
/reload-plugins
```
