# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository role

This repository is a shared plugin repo for **GitHub Copilot CLI** and **Claude Code**. The shared `skills/` tree is the single source of truth. Change skill behavior in `skills/*/SKILL.md`, not in duplicated runtime-specific copies.

## Validation commands

- Use Node 22 or newer.
- Install dependencies with `npm install`.
- Run structural/package validation with `npm test` or `npm run validate:plugin`.
- Run runtime verification with `npm run validate:runtime`. This performs an isolated Copilot plugin install/list/uninstall check and session-only plugin loading checks in both Copilot CLI and Claude Code.
- Run the single test file with `node --test test/plugin-layout.test.js`.

## Architecture

- `plugin.json` is the Copilot CLI manifest.
- `.claude-plugin/plugin.json` is the Claude plugin manifest.
- `.github/plugin/marketplace.json` is marketplace metadata for the Copilot plugin.
- `skills/<skill-name>/SKILL.md` files define the actual shared workflow behavior.
- `test/plugin-layout.test.js` enforces manifest sync, required skill sections, and package contents.
- `scripts/verify-runtime.mjs` performs real runtime verification against the installed CLIs.
- `docs/workflow-artifact-templates.md` defines the canonical committed templates for track reports, review-resolution summaries, and readiness reports.

## Repository-specific conventions

- Keep the repo plugin-first: skill logic belongs in `skills/*/SKILL.md`.
- Keep shared identity metadata aligned across `package.json`, `plugin.json`, `.claude-plugin/plugin.json`, `.github/plugin/marketplace.json`, and `.claude-plugin/marketplace.json`. The `version` field must be identical in all five files or tests will fail (both marketplace files carry it in `metadata.version` and in the `plugins[0].version` entry).
- Both marketplace files mirror `plugin.json` exactly for `author`, `keywords`, `tags`, `license`, `category`, and `description` in their plugin entry (`plugins[0]`) — the test asserts each field individually. The top-level `metadata.description` in each marketplace file is a human-readable summary and is not tested for parity.
- Preserve the intentional path difference: Copilot uses `["skills/"]`; Claude uses `"./skills/"`.
- Every skill must keep the tested shape, including frontmatter with `name` and `description`, plus `## Purpose`, `## When to Use It`, `## Project-Specific Inputs`, `## Workflow`, `## Required Gates`, `## Stop Conditions`, and an example section.
- The test file (`test/plugin-layout.test.js`) hardcodes the three skill names. Adding a new skill requires adding it to the `skills` array in that file as well as to both manifests.
- Keep skill content repo-agnostic and reusable across repositories.
- Preserve the three-skill split: implementation parallelism, review resolution, and final readiness are separate workflows.
- Prefer plugin-qualified names in examples, such as `/workflow-orchestration:parallel-implementation-loop`.

## Local plugin usage

To load this plugin in Claude Code for the current session:

```bash
claude --plugin-dir .
```

To check that Claude can see the plugin skills non-interactively:

```bash
claude -p --plugin-dir . --output-format text "List the plugin-qualified skill names loaded from this plugin, one per line and nothing else."
```

Reload plugin changes in an interactive Claude session with:

```text
/reload-plugins
```
