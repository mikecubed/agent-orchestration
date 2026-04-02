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
    WO[plugins/workflow-orchestration/]
    SDD[plugins/sdd-workflow/]

    ROOT --> GH
    ROOT --> CC
    ROOT --> DOCS
    ROOT --> TESTS
    ROOT --> RUNTIME
    ROOT --> WO
    ROOT --> SDD
```

## Responsibilities

- **Repo root**: umbrella docs, marketplace metadata, aggregate validation
- **`plugins/workflow-orchestration/`**: planning and workflow-loop plugin
- **`plugins/sdd-workflow/`**: companion SDD plugin bundle

The plugin identities stay precise even though the marketplace is shared.

