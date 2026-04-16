# Install Guide

Install only the plugin you need, or install multiple plugins together when you want planning, spec-driven workflows, clean-code enforcement, and PEAA patterns in the same repo.

## Install `flow`

The flow plugin includes both workflow orchestration and SDD (previously separate SDD).

```bash
copilot plugin install ./plugins/flow
claude --plugin-dir ./plugins/flow
```

## Install `ccc`

```bash
copilot plugin install ./plugins/ccc
claude --plugin-dir ./plugins/ccc
```

## Install `patterns`

```bash
copilot plugin install ./plugins/patterns
claude --plugin-dir ./plugins/patterns
```

## Install all plugins

```bash
copilot plugin install ./plugins/flow
copilot plugin install ./plugins/ccc
copilot plugin install ./plugins/patterns
```

For Claude Code, start a session with one plugin directory at a time or load them through your normal plugin management flow.

## Validation

From the umbrella repo root:

```bash
npm test
npm run validate:runtime
```
