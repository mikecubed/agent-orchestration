# Plugin Composition

`workflow-orchestration`, `sdd-workflow`, and `clean-code-codex` are separate plugins that can be installed independently or together.

## Composition model

```mermaid
flowchart LR
    USER[Developer request]
    WO[workflow-orchestration]
    PLAN[planning-orchestration]
    SDD[sdd-workflow]
    CODEX[clean-code-codex]
    SPEC[sdd.specify]
    P[sdd.plan]
    TASKS[sdd.tasks]
    EXEC[parallel-implementation-loop]

    USER --> WO
    WO --> PLAN
    PLAN --> SDD
    EXEC --> CODEX
    SDD --> SPEC
    SDD --> P
    SDD --> TASKS
    PLAN --> EXEC
```

## When to install both

Install both plugins when you want:

- planning that can optionally delegate to SDD;
- explicit `sdd.specify`, `sdd.plan`, and `sdd.tasks` commands;
- clean-code enforcement and targeted review checks from Codex;
- one repo-local marketplace source for both plugins.

## When to install only one

- Install only **`workflow-orchestration`** when you want execution, review-resolution, and readiness workflows without SDD.
- Install only **`sdd-workflow`** when you want spec/plan/tasks generation without the orchestration loops.
- Install only **`clean-code-codex`** when you want clean-code audits and enforcement without the workflow orchestration loops.
