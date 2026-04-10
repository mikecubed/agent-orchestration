# agent-orchestration

Umbrella marketplace repo for separate **GitHub Copilot CLI** and **Claude Code** plugins focused on planning, workflow orchestration, and spec-driven development.

## Plugin bundles

### `plugins/workflow-orchestration`

Shared orchestration plugin with:

- `idea-to-done-orchestration`
- `planning-orchestration`
- `parallel-implementation-loop`
- `pr-review-resolution-loop`
- `final-pr-readiness-gate`

Local install:

```bash
copilot plugin install ./plugins/workflow-orchestration
claude --plugin-dir ./plugins/workflow-orchestration
```

### `plugins/sdd-workflow`

Companion SDD plugin with:

- `sdd.specify`
- `sdd.plan`
- `sdd.tasks`
- `sdd-feature-workflow`

Local install:

```bash
copilot plugin install ./plugins/sdd-workflow
claude --plugin-dir ./plugins/sdd-workflow
```

### `plugins/clean-code-codex`

Clean-code enforcement plugin with:

- `conductor`
- `tdd-check`, `arch-check`, `type-check`, `naming-check`
- `size-check`, `dead-check`, `test-check`, `sec-check`, `dep-check`, `obs-check`
- supporting command, agent, scripts, and enforcement hooks

Local install:

```bash
copilot plugin install ./plugins/clean-code-codex
claude --plugin-dir ./plugins/clean-code-codex
```

## Marketplace role

The repo root is umbrella-only infrastructure:

- `.github/plugin/marketplace.json` for Copilot marketplace metadata
- `.claude-plugin/marketplace.json` for Claude marketplace metadata
- `docs/` for umbrella install and composition docs
- `scripts/verify-runtime.mjs` for aggregate runtime validation
- `test/` for umbrella-level structure checks

## Docs

- `docs/marketplace-overview.md`
- `docs/install-guide.md`
- `docs/plugin-composition.md`
- `plugins/workflow-orchestration/docs/workflow-usage-guide.md`

## Validation

Run the full umbrella validation:

```bash
npm test
npm run validate:runtime
```

Run the workflow plugin validation directly:

```bash
npm --prefix plugins/workflow-orchestration test
npm --prefix plugins/workflow-orchestration run validate:runtime
```

Plugin names stay precise even though the marketplace is shared. Prefer plugin-qualified names such as `/workflow-orchestration:planning-orchestration` and `/sdd-workflow:sdd.plan`.
