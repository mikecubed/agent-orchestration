# Install Guide

Install only the plugin you need, or install multiple plugins together when you want planning, spec-driven workflows, and clean-code enforcement in the same repo.

## Install `workflow-orchestration`

```bash
copilot plugin install ./plugins/workflow-orchestration
claude --plugin-dir ./plugins/workflow-orchestration
```

## Install `sdd-workflow`

```bash
copilot plugin install ./plugins/sdd-workflow
claude --plugin-dir ./plugins/sdd-workflow
```

## Install `clean-code-codex`

```bash
copilot plugin install ./plugins/clean-code-codex
claude --plugin-dir ./plugins/clean-code-codex
```

## Install all three

```bash
copilot plugin install ./plugins/workflow-orchestration
copilot plugin install ./plugins/sdd-workflow
copilot plugin install ./plugins/clean-code-codex
```

For Claude Code, start a session with one plugin directory at a time or load them through your normal plugin management flow.

## Validation

From the umbrella repo root:

```bash
npm test
npm run validate:runtime
```
