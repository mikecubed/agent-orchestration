# Contributing

This repository is an umbrella marketplace for separate **GitHub Copilot CLI** and **Claude Code** plugins. The main bundles currently live under `plugins/flow/`, `plugins/flow/`, and `plugins/ccc/`.

## What to change

- Change workflow behavior for the orchestration plugin in `plugins/flow/skills/<skill-name>/SKILL.md`.
- Change marketplace packaging or identity in `.github/plugin/marketplace.json` or `.claude-plugin/marketplace.json`.
- Change umbrella validation rules in `test/umbrella-layout.test.js`.
- Change workflow plugin validation rules in `plugins/flow/test/plugin-layout.test.js`.
- Change Codex plugin validation rules in `plugins/ccc/test/plugin-layout.test.js`.
- Change local/runtime verification behavior in `scripts/verify-runtime.mjs`.

## Skill authoring rules

Every shared skill must:

- live at `plugins/flow/skills/<skill-name>/SKILL.md`;
- keep the frontmatter `name` aligned with the directory name;
- include the sections enforced by the test suite, including `## Purpose`, `## When to Use It`, `## Project-Specific Inputs`, `## Workflow`, `## Required Gates`, `## Stop Conditions`, and at least one `## Example` section.

Keep skill content repo-agnostic. These skills are meant to be reusable across repositories, so avoid hardcoding branch names, file layouts, or validation commands that only make sense here.

## Validation

Use Node 22 or newer.

Install dependencies:

```bash
npm install
```

Run the umbrella test suite:

```bash
npm test
```

Run the same validation through the named script:

```bash
npm run validate:plugin
```

Verify the umbrella packaged artifact surface:

```bash
npm pack --dry-run
```

Verify real CLI/plugin loading:

```bash
npm run validate:runtime
```

`validate:runtime` is intentionally opt-in rather than a CI gate. It uses authenticated local CLIs, performs an isolated Copilot install/list/uninstall check, and runs session-only plugin loading checks in both Copilot CLI and Claude Code.

Run the workflow plugin test suite directly:

```bash
npm --prefix plugins/flow test
```

Run the Codex plugin test suite directly:

```bash
npm --prefix plugins/ccc test
```

## Runtime-specific manifest notes

The flow Copilot and Claude manifests intentionally use different `skills` path syntax:

- `plugins/flow/plugin.json` uses `["skills/"]`;
- `plugins/flow/.claude-plugin/plugin.json` uses `"./skills/"`.

That difference is expected and is documented in the tests and README.

## Local testing

For Copilot CLI, load the workflow plugin directly:

```bash
copilot -p "List the plugin-qualified skill names loaded from this plugin, one per line and nothing else." --plugin-dir ./plugins/flow --allow-all-tools --output-format text
```

For Claude Code:

```bash
claude -p --plugin-dir ./plugins/flow --output-format text "List the plugin-qualified skill names loaded from this plugin, one per line and nothing else."
```

To test interactively in Claude Code, run:

```bash
claude --plugin-dir ./plugins/flow
```

Then reload changes with:

```text
/reload-plugins
```

## Opening changes

Prefer small PRs that keep one theme together:

- skill-content changes;
- test/validation changes;
- packaging/runtime changes;
- contributor-doc changes.

If you change skill structure or manifest metadata, run both `npm test` and `npm run validate:runtime` before opening the PR.

## Durable workflow artifacts

If you need a durable on-disk artifact for implementation, review-resolution, or readiness work, use the canonical templates in:

- `plugins/flow/docs/workflow-artifact-templates.md`

Keep generated workflow artifacts out of `docs/` and store them under the repo-root dot-directory `.flow/artifacts/` instead. Always create them when the workflow calls for a durable report or summary, but do not stage or commit them unless the developer explicitly asks. Use descriptive names such as:

- `.flow/artifacts/track-report-<topic>.md`
- `.flow/artifacts/review-resolution-<topic>.md`
- `.flow/artifacts/readiness-report-<topic>.md`
