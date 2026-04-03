# workflow-orchestration

Shared plugin for planning, implementation, review-resolution, and PR-readiness orchestration across **GitHub Copilot CLI** and **Claude Code**.

## Skills

This plugin provides:

- `planning-orchestration`
- `parallel-implementation-loop`
- `pr-review-resolution-loop`
- `final-pr-readiness-gate`
- `swarm-orchestration`
- `systematic-debugging`

Install locally from the umbrella repo:

```bash
copilot plugin install ./plugins/workflow-orchestration
claude --plugin-dir ./plugins/workflow-orchestration
```

Expected namespaced usage:

```text
/workflow-orchestration:planning-orchestration
/workflow-orchestration:parallel-implementation-loop
```

## Plugin layout

- `plugin.json` — Copilot manifest
- `.claude-plugin/plugin.json` — Claude manifest
- `skills/*/SKILL.md` — shared skill definitions
- `docs/models-config-template.md` — model override examples
- `docs/workflow-artifact-templates.md` — durable artifact templates
- `test/plugin-layout.test.js` — workflow plugin structural checks

## Validation

From the umbrella repo root:

```bash
npm --prefix plugins/workflow-orchestration test
npm --prefix plugins/workflow-orchestration run validate:runtime
```

The runtime validation delegates to the umbrella `scripts/verify-runtime.mjs` helper but scopes it to this plugin only.

If you are already in `plugins/workflow-orchestration/`, the equivalent local install commands are:

```bash
copilot plugin install .
claude --plugin-dir .
```

## Notes

- The plugin stays separate from `sdd-workflow`, but `planning-orchestration` may optionally compose with it.
- Prefer plugin-qualified names in docs and examples.
