# agent-orchestration

Umbrella marketplace repo for separate **GitHub Copilot CLI** and **Claude Code** plugins focused on planning, workflow orchestration, spec-driven development, clean-code enforcement, and enterprise patterns.

## Plugin bundles

### `plugins/flow`

Unified workflow orchestration and SDD plugin (merges the former workflow-orchestration and sdd-workflow plugins) with:

- `idea-to-done-orchestration`
- `planning-orchestration`
- `parallel-impl`
- `pr-review-resolution-loop`
- `final-pr-readiness-gate`
- `sdd.specify`, `sdd.plan`, `sdd.tasks`, `sdd-feature-workflow`

Local install:

```bash
copilot plugin install ./plugins/flow
claude --plugin-dir ./plugins/flow
```

### `plugins/ccc`

Clean-code enforcement plugin with:

- `conductor`
- `tdd-check`, `arch-check`, `type-check`, `naming-check`
- `size-check`, `dead-check`, `test-check`, `sec-check`, `dep-check`, `obs-check`
- supporting command, agent, scripts, and enforcement hooks

Local install:

```bash
copilot plugin install ./plugins/ccc
claude --plugin-dir ./plugins/ccc
```

### `plugins/patterns`

PEAA (Patterns of Enterprise Application Architecture) skills plugin.

Local install:

```bash
copilot plugin install ./plugins/patterns
claude --plugin-dir ./plugins/patterns
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
- `plugins/flow/docs/workflow-usage-guide.md`

## Validation

Run the full umbrella validation:

```bash
npm test
npm run validate:runtime
```

Run the flow plugin validation directly:

```bash
npm --prefix plugins/flow test
npm --prefix plugins/flow run validate:runtime
```

Plugin names stay precise even though the marketplace is shared. Prefer plugin-qualified names such as `/flow:planning-orchestration` and `/flow:sdd.plan`.
