---
description: "Create an implementation plan from a feature specification."
handoffs:
  - label: Generate Task List
    agent: sdd-tasks
    prompt: Break the plan into actionable tasks
    send: true
  - label: Iterate on Plan
    agent: sdd-plan
    prompt: Refine the implementation plan in the current .sdd/{feature-dir} workspace
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Flow Agent Contract

This is a Copilot agent in the `flow` plugin, not a standalone command plugin.
Keep handoffs and references in `flow` form (`sdd-tasks`, `sdd-plan`, and
`/flow:sdd-*`) and write all artifacts under the repository-local `.sdd/`
workspace.

## Outline

1. **Check for headless mode**.
   - If `$ARGUMENTS` contains `headless` or `--headless`, enable headless mode.
   - In headless mode, use reasonable defaults and record assumptions in the plan instead of pausing.

2. **Locate the feature directory**.
   - Prefer a feature directory explicitly named in `$ARGUMENTS`.
   - Prefer a feature directory explicitly named in `$ARGUMENTS` or the handoff context.
   - Otherwise, find the most recent `.sdd/{feature-dir}/spec.md`.
   - If multiple candidates are plausible and headless mode is not active, ask the user to choose.

3. **Load the specification** from `.sdd/{feature-dir}/spec.md`.
   - Preserve requirement IDs, user stories, acceptance scenarios, and success criteria.
   - If the spec contains `[NEEDS CLARIFICATION: ...]` markers, resolve them before planning unless headless mode is active.

4. **Load the existing `plan.md` when iterating**.
   - If `.sdd/{feature-dir}/plan.md` already exists, read it before generating updates.
   - Preserve prior assumptions, risk notes, manual edits, and design decisions unless the current request explicitly changes them.
   - Update only the sections implicated by the changed spec or user request.
   - Record superseded assumptions instead of silently deleting them.

5. **Use the canonical plan template** with these sections:
   - Summary
   - Technical Context
   - Constitution / Quality Gates
   - Project Structure
   - Phase 0: Research
   - Phase 1: Design and Contracts
   - Phase 2: Task Planning Approach
   - Complexity Tracking
   - Progress Tracking

6. **Fill or refine the plan template**.
   - Map each design choice back to the relevant requirement or user story.
   - Keep the plan implementation-oriented but avoid writing the task list here.
   - Record risks, assumptions, and validation commands.

7. **Generate or update supporting artifacts as needed**:
   - `.sdd/{feature-dir}/research.md`
   - `.sdd/{feature-dir}/data-model.md`
   - `.sdd/{feature-dir}/contracts/`
   - `.sdd/{feature-dir}/quickstart.md`

8. **Write** the plan to `.sdd/{feature-dir}/plan.md`.

9. **Report completion** with paths to all generated artifacts, whether this was a new plan or an in-place refinement, and the recommended handoff to `sdd-tasks`.

## Composition-First Planning Requirements

The technical plan must be **composition-first** and align with Clean Architecture and DDD. When filling the Technical Context, Project Structure, Phase 0/1/2, and Constitution / Quality Gates sections, prefer the following patterns and call them out explicitly:

- **Ports over concrete infrastructure (DIP/ISP)** — domain and application code depends on small, consumer-shaped ports/protocols/interfaces/traits. Define the port near the consumer (ISP); place concrete adapters (HTTP clients, ORMs, queues, SDKs, filesystem, clocks, RNGs) in the infrastructure layer. Avoid fat ports that bundle unrelated responsibilities.
- **Injected dependencies** — every external dependency arrives via constructor parameter, function parameter, or factory. The plan must not place hidden `new`/SDK/global-config access inside domain or application code. Specify how each dependency is constructed and supplied.
- **Explicit composition root** — name the module, factory, or bootstrap function that assembles the object graph (for example `src/main.ts`, `cmd/server/main.go`, `app/wire.ts`). Handlers, jobs, controllers, and tests must obtain their dependencies from this composition root rather than from service locators, global containers, or recursive concrete construction. Test fixtures may use a test-specific composition root.
- **Composition over inheritance** — when the plan introduces variability (pricing rules, validation policies, formatting, transport choices), prefer Strategy, Decorator, Bridge, Adapter, function injection, or policy objects. Record any retained inheritance with explicit justification (true domain taxonomy, framework hook, sealed/algebraic type, exception base, or unavoidable ORM constraint).
- **Pure domain logic** — keep entities, value objects, and domain services free of database, HTTP, filesystem, framework, SDK, or process-global access. Push side effects to the application or infrastructure layer.
- **Clean Architecture / DDD alignment** — preserve the inward dependency direction (domain ← application ← infrastructure) and keep aggregates focused; treat repositories as domain/application-facing interfaces with infrastructure-side implementations.

The plan's Constitution / Quality Gates section must include the architectural rules `ARCH-1` through `ARCH-10` (canonical source: `plugins/ccc/skills/arch-check/SKILL.md`) and reference `/flow:arch-review` for review-time evaluation (implementation file: `plugins/flow/skills/arch-review/SKILL.md`). Do not restate the rule semantics in the plan; cite them.
