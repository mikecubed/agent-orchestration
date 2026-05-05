---
description: "Generate an actionable, dependency-ordered task list from the feature plan."
handoffs:
  - label: Iterate on Tasks
    agent: sdd-tasks
    prompt: Refine the task list in the current .sdd/{feature-dir} workspace
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Flow Agent Contract

This is a Copilot agent in the `flow` plugin, not a standalone command plugin.
Keep handoffs and references in `flow` form (`sdd-tasks` and `/flow:sdd-*`)
and write all artifacts under the repository-local `.sdd/` workspace.

## Outline

1. **Check for headless mode**.
   - If `$ARGUMENTS` contains `headless` or `--headless`, enable headless mode.
   - In headless mode, use reasonable defaults and record assumptions in `tasks.md`.

2. **Locate the feature directory**.
   - Prefer a feature directory explicitly named in `$ARGUMENTS`.
   - Prefer a feature directory explicitly named in `$ARGUMENTS` or the handoff context.
   - Otherwise, find the most recent `.sdd/{feature-dir}/plan.md`.
   - If multiple candidates are plausible and headless mode is not active, ask the user to choose.

3. **Load** `plan.md`, `spec.md`, and optional supporting design docs.
   - Include `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` when present.
   - Preserve traceability to user stories, requirements, contracts, and validation gates.

4. **Load the existing `tasks.md` when iterating**.
   - If `.sdd/{feature-dir}/tasks.md` already exists, read it before generating updates.
   - Preserve prior task IDs, ordering adjustments, and manually curated notes unless the current plan change explicitly invalidates them.
   - Append new tasks after the existing relevant story group where possible instead of renumbering the full list.
   - Mark superseded tasks rather than silently deleting them when traceability matters.

5. **Generate or refine** a dependency-ordered task list by user story using the strict `T###` format.
   - Every task must be actionable and independently checkable.
   - Mark tasks that can run in parallel with `[P]`.
   - Keep tasks grouped by user story so each story can be implemented and tested independently.
   - Include test tasks before implementation tasks where the plan requires tests.
   - Include integration, validation, and documentation tasks where required by the plan.

6. **Write** tasks to `.sdd/{feature-dir}/tasks.md`.

7. **Report** total task count, per-story breakdown, parallelization opportunities, suggested MVP scope, and whether this was a new task list or an in-place refinement.

## Composition-First Task Generation

When the plan calls for ports, injected dependencies, composition roots, or a composition-vs-inheritance decision, the generated task list must include corresponding tests and validation tasks. Include the following kinds of tasks where applicable, ordered with tests before implementation:

- **Port / protocol / interface tasks** — define the smallest useful port for each external dependency named in the plan (DIP/ISP). Add a contract or interface test that exercises the port without a concrete adapter.
- **Adapter implementation tasks** — implement the concrete infrastructure adapter for each port (HTTP/DB/queue/SDK/filesystem/clock/RNG). Place the adapter in the infrastructure layer and pair it with an integration test against the real or fake dependency.
- **Dependency injection wiring tasks** — wire each adapter to its consumer through constructor parameters or factories; do not allow hidden construction inside domain or application code. Include a unit test that substitutes a fake/double for the port to prove the consumer is decoupled.
- **Composition root tasks** — create or update the explicit composition root (startup module, factory, or bootstrap function) that assembles the object graph. Include a smoke test or wiring test that boots the composition root and verifies the graph is complete.
- **Inheritance justification tasks** — for any retained inheritance hierarchy in the plan, add a task to record the justification (true domain taxonomy, framework hook, sealed/algebraic type, exception base, or ORM constraint) in code comments or design notes, and a refactor task to convert unjustified inheritance to composition (Strategy, Decorator, Bridge, Adapter, function injection, or policy object) before implementation completes.
- **Architecture validation task** — include at least one task to run `/flow:arch-review` (or invoke `ccc/arch-check`) against the implemented feature and confirm `ARCH-1` through `ARCH-10` are PASS or have justified waivers.

Mark tasks `[P]` only when they touch independent files and have no shared mutable state. Keep test tasks before implementation tasks within each story group.
