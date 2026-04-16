# Plugin Composition

`flow`, `ccc`, and `patterns` are separate plugins that can be installed independently or together.

## Composition model

```mermaid
flowchart LR
    USER[Developer request]
    FLOW[flow]
    PLAN[plan]
    SDD[sdd skills]
    CCC[ccc]
    PAT[patterns]
    SPEC[sdd-specify]
    P[sdd-plan]
    TASKS[sdd-tasks]
    EXEC[parallel-impl]

    USER --> FLOW
    FLOW --> PLAN
    PLAN --> SDD
    EXEC --> CCC
    SDD --> SPEC
    SDD --> P
    SDD --> TASKS
    PLAN --> EXEC
    USER --> PAT
```

## When to install multiple plugins

Install multiple plugins together when you want:

- planning with integrated SDD (specify, plan, tasks) via the unified flow plugin;
- clean-code enforcement and targeted review checks from ccc;
- PEAA pattern guidance from patterns;
- one repo-local marketplace source for all plugins.

## When to install only one

- Install only **`flow`** when you want execution, review-resolution, readiness workflows, and SDD together.
- Install only **`ccc`** when you want clean-code audits and enforcement without the workflow orchestration loops.
- Install only **`patterns`** when you want PEAA pattern guidance without workflow orchestration or code enforcement.
