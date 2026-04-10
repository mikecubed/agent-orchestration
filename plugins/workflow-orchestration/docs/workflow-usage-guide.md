# Workflow usage guide

Use this guide when you want the plugin to feel like a coherent product instead of a flat skill list. It explains the main composed loops, then gives a quick "when to use it" reference for each workflow.

Prefer plugin-qualified names such as `/workflow-orchestration:delivery-orchestration`.

## Start here

| If you are trying to... | Start with | Then usually go to |
| --- | --- | --- |
| Carry clarified work through the whole loop | `idea-to-done-orchestration` | specialist phases are sequenced automatically or with explicit stop points |
| Explore a rough feature idea | `brainstorm-ideation` | `planning-orchestration` or `sdd-workflow` |
| Turn a clarified idea into a scoped plan | `planning-orchestration` | `delivery-orchestration` |
| Execute a reviewed plan or next-ready task | `delivery-orchestration` | `diff-review-orchestration` |
| Review a branch or PR diff | `diff-review-orchestration` | `pr-review-resolution-loop` |
| Work through review feedback | `pr-review-resolution-loop` | `final-pr-readiness-gate` |
| Decide if a branch is actually ready | `final-pr-readiness-gate` | `pr-publish-orchestration` |
| Publish a ready branch as a PR | `pr-publish-orchestration` | human review or `release-orchestration` after merge |
| Capture a reusable lesson | `knowledge-compound` | future planning and review workflows consume it advisory-only |
| Debug a failing behavior or regression | `systematic-debugging` | `knowledge-compound` if the result is reusable |
| Run a post-incident analysis | `incident-rca` | follow-up planning or `knowledge-compound` |

## Shared defaults and durable state

The plugin now documents one shared foundation for higher-level automation:

- `.workflow-orchestration/defaults.json` — repo-level workflow defaults. See
  `docs/workflow-defaults-contract.md`.
- `.workflow-orchestration/state.json` — durable workflow lifecycle state. See
  `docs/workflow-state-contract.md`.

The first workflows that consume the shared defaults are:

- `planning-orchestration` for planning sinks and discovery context;
- `delivery-orchestration` for direct-execution report sinks and default
  post-delivery review-mode suggestions;
- `diff-review-orchestration` for review-mode baseline and related guardrails;
- `pr-publish-orchestration` for publish preferences and durable publish-summary
  sinks;
- `knowledge-compound` for repo-default knowledge sinks.

When defaults are missing or only partially configured, those workflows keep
their existing fallback behavior. Durable workflow state is intentionally
separate from transient session continuity in `.agent/SESSION.md` and
`.agent/HANDOFF.json`.

## The main composed loops

### 1. Clarified work to publish-ready result

Use this when the work is already clarified and you want one opt-in conductor to
own the lifecycle sequencing.

```text
idea-to-done-orchestration
  -> brainstorm-ideation (only if needed)
  -> planning-orchestration (only if needed)
  -> delivery-orchestration
  -> diff-review-orchestration
  -> pr-review-resolution-loop (only if needed)
  -> final-pr-readiness-gate
  -> pr-publish-orchestration
  -> knowledge-compound (optional)
```

Notes:

- `idea-to-done-orchestration` supports `manual`, `guided`, and `auto` modes.
- It updates `.workflow-orchestration/state.json` at major phase boundaries while
  it owns the lifecycle.
- It stops when requirements stay unclear, a human decision is required,
  readiness is not achieved, or release/merge policy requires a separate step.
- Manual entry into the specialist workflows remains valid.

### 2. Specialist manual path for clarified idea to PR-ready branch

Use this when the work is feature-shaped and you want the normal delivery path.

```text
brainstorm-ideation (optional)
  -> planning-orchestration / sdd-workflow
  -> delivery-orchestration
  -> diff-review-orchestration
  -> pr-review-resolution-loop
  -> final-pr-readiness-gate
  -> pr-publish-orchestration
```

Notes:

- Start at `brainstorm-ideation` only if the idea is still fuzzy.
- `delivery-orchestration` chooses direct implementation, parallel tracks, swarm, or debugging.
- When direct implementation is chosen, the route is expected to produce a
  durable direct-execution report plus a normalized review handoff for
  `diff-review-orchestration`.
- `pr-publish-orchestration` stops at commit / push / PR publication. It does not do release work.

### 3. Bug or regression to reusable lesson

Use this when the main problem is fault isolation rather than new feature delivery.

```text
systematic-debugging
  -> diff-review-orchestration (if code changed)
  -> final-pr-readiness-gate
  -> knowledge-compound
```

Notes:

- If the fix attracts review feedback, insert `pr-review-resolution-loop` before the final gate.
- `knowledge-compound` is the right place for non-obvious debugging lessons that should survive the session.

### 4. Incident to follow-up change

Use this when the immediate need is understanding what happened, not just patching code.

```text
incident-rca
  -> planning-orchestration
  -> delivery-orchestration
  -> review / gate / publish
  -> knowledge-compound
```

Notes:

- `incident-rca` explains the event.
- Planning and delivery own the corrective or preventative changes.

### 5. Large or uncertain execution

Use this when the work is too unclear or too coupled for fixed parallel tracks.

```text
planning-orchestration
  -> delivery-orchestration
  -> swarm-orchestration
  -> diff-review-orchestration
  -> readiness / publish
```

Notes:

- Reach for `swarm-orchestration` only when decomposition itself is part of the problem.
- If task boundaries are already clear, `parallel-implementation-loop` is usually the better fit.

## Workflow reference

### Core loop workflows

| Workflow | Use it when | Do not use it when | Typical next step |
| --- | --- | --- | --- |
| `idea-to-done-orchestration` | You want one opt-in workflow to carry clarified work across planning entry, delivery, review, readiness, publication, and optional knowledge capture. | The request is still exploratory, purely release-shaped, or you only need one specialist phase. | the next owned specialist workflow or a documented stop-for-human boundary |
| `brainstorm-ideation` | The idea is still fuzzy and you need constraints, trade-offs, and risks surfaced before spec work. | Requirements are already clear or the task is a narrow bug fix. | `planning-orchestration` or `sdd-workflow` |
| `planning-orchestration` | You need a durable plan, sequencing, validation, and execution handoff. | The change is already fully scoped and tiny. | `delivery-orchestration` |
| `delivery-orchestration` | You have accepted scope and want the best execution path chosen for you. | The request is still exploratory, review-shaped, or release-shaped. | direct implementation (with a durable direct-execution report), `parallel-implementation-loop`, `swarm-orchestration`, or `systematic-debugging` |
| `parallel-implementation-loop` | There are multiple independent ready tasks and you want disciplined parallel tracks. | Boundaries are unclear or tasks interact heavily. | `diff-review-orchestration` |
| `swarm-orchestration` | The work is large or uncertain enough that decomposition must happen at runtime. | The task list is already clean and fixed. | `diff-review-orchestration` |
| `diff-review-orchestration` | You want a first-class diff review on a branch, PR, or commit range. | You are still implementing or you only need to resolve existing comments. | `pr-review-resolution-loop` or `final-pr-readiness-gate` |
| `pr-review-resolution-loop` | There are review comments or findings that need triage, fixes, replies, and closure. | You need a first-pass review rather than comment resolution. | `final-pr-readiness-gate` |
| `final-pr-readiness-gate` | The branch is stable and you want an explicit ready / not-ready judgment. | The diff is still changing significantly. | `pr-publish-orchestration` |
| `pr-publish-orchestration` | The exact tree is ready and you need commit / push / PR creation or update. | Readiness is missing, stale, or the request is really about releasing. | human review or `release-orchestration` after merge |
| `release-orchestration` | Post-merge branch is ready for versioning, changelog, tagging, and optional release creation. | You only need to publish a PR. | release complete |
| `knowledge-compound` | A completed workflow produced a reusable lesson worth preserving durably. | The work is still in progress or the task is a normal README/docs update. | future planning or review uses the artifact advisory-only |

### Specialist and support workflows

| Workflow | Use it when | Do not use it when | Typical next step |
| --- | --- | --- | --- |
| `map-codebase` | You need a clean factual orientation to the repository before planning or delivery. | You already know the exact files and boundaries. | `planning-orchestration`, `architecture-review`, or delivery |
| `architecture-review` | You need design pressure-testing, ADR-like reasoning, or architecture trade-off review. | The work is just a small implementation slice. | planning, delivery, or explicit ADR follow-up |
| `systematic-debugging` | The task is fault isolation, a failing test, or a regression investigation. | The work is primarily feature delivery. | `knowledge-compound`, review, or a follow-up delivery workflow |
| `incident-rca` | You need post-incident causal analysis and a durable incident report. | You only need to fix a local bug quickly. | planning for follow-up changes or `knowledge-compound` |
| `git-worktree-orchestration` | You need worktree creation, validation, or cleanup for parallel tracks. | You are not actually running isolated parallel work. | `parallel-implementation-loop` |
| `e2e-test-generation` | A scoped feature needs end-to-end test coverage added deliberately. | You are still exploring the feature shape. | delivery, review, or readiness |
| `contract-generator` | You need a contract/schema/testable interface artifact generated from agreed scope. | The task is exploratory or the contract is already stable. | planning, implementation, or review |

## How to choose between the execution workflows

| If the work looks like... | Use |
| --- | --- |
| one tight task, one file or one small module | `delivery-orchestration` -> direct implementation + direct-execution report |
| several independent ready tasks | `delivery-orchestration` -> `parallel-implementation-loop` |
| a large change with unclear boundaries | `delivery-orchestration` -> `swarm-orchestration` |
| a failing behavior, regression, or reproducibility problem | `delivery-orchestration` -> `systematic-debugging` |

## What the higher-level conductor adds now

The plugin now has both:

- the **specialist workflows** for explicit phase-by-phase control; and
- one **opt-in conductor** for clarified work that wants lifecycle glue.

That means:

1. use `idea-to-done-orchestration` when you want one bounded workflow to carry
   clarified work across the major phases;
2. use the specialist workflows directly when you want precise phase-by-phase
   control;
3. treat `knowledge-compound` as conditional, not mandatory;
4. treat continuation/resume as a later concern — the conductor records durable
   workflow state, but Phase 4 continuation behavior remains intentionally
   separate.
