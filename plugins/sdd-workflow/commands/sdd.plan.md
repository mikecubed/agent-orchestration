---
description: "Create an implementation plan from a feature specification."
handoffs:
  - label: Generate Task List
    agent: sdd.tasks
    prompt: Break the plan into actionable tasks
    send: true
  - label: Iterate on Plan
    agent: sdd.plan
    prompt: Refine the implementation plan
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Check for headless mode**.
2. **Locate the feature directory**.
3. **Load the specification** from `.sdd/{feature-dir}/spec.md`.
4. **Use the canonical plan template** with summary, technical context, project structure, research findings, data model, and interface contracts.
5. **Fill the plan template** and generate supporting artifacts (`data-model.md`, `contracts/`, `research.md`) as needed.
6. **Write** the plan to `.sdd/{feature-dir}/plan.md`.
7. **Report completion** with paths to all generated artifacts.
