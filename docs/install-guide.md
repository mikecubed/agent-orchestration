# Install Guide

Install only the plugin you need, or install both when you want planning plus spec-driven workflows.

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

## Install both

```bash
copilot plugin install ./plugins/workflow-orchestration
copilot plugin install ./plugins/sdd-workflow
```

For Claude Code, start a session with one plugin directory at a time or load them through your normal plugin management flow.

## Validation

From the umbrella repo root:

```bash
npm test
npm run validate:runtime
```

