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

Generate a dependency-ordered task list in `.sdd/{feature-dir}/tasks.md` and report the task count, per-story breakdown, and suggested MVP scope.
