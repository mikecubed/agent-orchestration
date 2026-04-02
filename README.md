# agent-orchestration

Umbrella marketplace repo for separate **GitHub Copilot CLI** and **Claude Code** plugins focused on planning, workflow orchestration, and spec-driven development.

## Plugins in this repo

### `workflow-orchestration`

The root plugin in this repository provides shared orchestration skills:

- `planning-orchestration`
- `parallel-implementation-loop`
- `pr-review-resolution-loop`
- `final-pr-readiness-gate`

Install locally:

```bash
copilot plugin install .
claude --plugin-dir .
```

Expected namespaced usage:

```text
/workflow-orchestration:planning-orchestration
/workflow-orchestration:parallel-implementation-loop
```

### `sdd-workflow`

The companion plugin lives under `plugins/sdd-workflow/` and provides:

- `sdd.specify`
- `sdd.plan`
- `sdd.tasks`
- `sdd-feature-workflow`

Install locally:

```bash
copilot plugin install ./plugins/sdd-workflow
claude --plugin-dir ./plugins/sdd-workflow
```

Expected namespaced usage:

```text
/sdd-workflow:sdd.specify
/sdd-workflow:sdd.plan
/sdd-workflow:sdd.tasks
```

## Marketplace layout

This repo is both:

- the home of the `workflow-orchestration` plugin; and
- the marketplace source for multiple companion plugins via:
  - `.github/plugin/marketplace.json`
  - `.claude-plugin/marketplace.json`

The current umbrella name is **`agent-orchestration`**.

## Development

Validate the root `workflow-orchestration` plugin with:

```bash
npm test
npm run validate:runtime
```

These checks validate:

- plugin manifests and marketplace metadata;
- required shared skill layout and protocol language;
- package contents;
- runtime loading for both Claude Code and Copilot CLI.

## Notes

- plugin names stay precise even though the marketplace is shared;
- `workflow-orchestration` may optionally compose with `sdd-workflow`, but they remain separate installable plugins;
- prefer plugin-qualified names in examples and documentation.
