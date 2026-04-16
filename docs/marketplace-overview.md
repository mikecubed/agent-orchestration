# Marketplace Overview

`agent-orchestration` is an umbrella repo and marketplace source for multiple installable plugins.

## Current layout

```mermaid
flowchart TD
    ROOT[agent-orchestration repo root]
    GH[.github/plugin/marketplace.json]
    CC[.claude-plugin/marketplace.json]
    DOCS[docs/]
    TESTS[test/umbrella-layout.test.js]
    RUNTIME[scripts/verify-runtime.mjs]
    FLOW[plugins/flow/]
    CCC[plugins/ccc/]
    PAT[plugins/patterns/]

    ROOT --> GH
    ROOT --> CC
    ROOT --> DOCS
    ROOT --> TESTS
    ROOT --> RUNTIME
    ROOT --> FLOW
    ROOT --> CCC
    ROOT --> PAT
```

## Responsibilities

- **Repo root**: umbrella docs, marketplace metadata, aggregate validation
- **`plugins/flow/`**: unified planning, workflow-loop, and SDD plugin
- **`plugins/ccc/`**: clean-code enforcement and audit plugin
- **`plugins/patterns/`**: PEAA, GoF, and DDD design patterns plugin

The plugin identities stay precise even though the marketplace is shared.
