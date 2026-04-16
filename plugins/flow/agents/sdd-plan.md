---
description: "Create an implementation plan from a feature specification."
handoffs:
  - label: Generate Task List
    agent: sdd-tasks
    prompt: Break the plan into actionable tasks
    send: true
  - label: Iterate on Plan
    agent: sdd-plan
    prompt: Refine the implementation plan
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

Create an implementation plan in `.sdd/{feature-dir}/plan.md`, generate supporting artifacts as needed, and report the resulting paths.
