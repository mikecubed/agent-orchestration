---
description: "Generate an actionable, dependency-ordered task list from the feature plan."
handoffs:
  - label: Iterate on Tasks
    agent: sdd.tasks
    prompt: Refine the task list
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Check for headless mode**.
2. **Locate the feature directory**.
3. **Load** `plan.md`, `spec.md`, and optional supporting design docs.
4. **Generate** a dependency-ordered task list by user story using the strict `T###` format.
5. **Write** tasks to `.sdd/{feature-dir}/tasks.md`.
6. **Report** total task count, per-story breakdown, and suggested MVP scope.
