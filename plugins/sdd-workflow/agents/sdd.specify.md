---
description: "Create a feature specification from a natural language description."
handoffs:
  - label: Create Implementation Plan
    agent: sdd.plan
    prompt: Create a plan for this spec
    send: true
  - label: Iterate on Spec
    agent: sdd.specify
    prompt: Refine the specification
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

Generate a feature specification in `.sdd/{feature-dir}/spec.md`, write the requirements checklist, and report the resulting paths.
