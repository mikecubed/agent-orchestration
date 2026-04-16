# Workflow usage guide

Use this guide when you want the plugin to feel like a coherent product instead of a flat skill list. It explains the main composed loops, then gives a quick "when to use it" reference for each workflow in `flow`.

Prefer plugin-qualified names such as `/flow:deliver`.

This guide is exhaustive for the workflows shipped by this plugin. It may also
mention companion routes such as the SDD skills (`flow:sdd-specify`, `flow:sdd-plan`, `flow:sdd-tasks`) where they are common handoffs,
but those are external to `flow` itself.

## Start here

| If you are trying to... | Start with | Then usually go to |
| --- | --- | --- |
| Carry clarified work through the whole loop | `idea-to-done` | specialist phases plus merge-aware closeout are sequenced automatically or with explicit stop points |
| Explore a rough feature idea | `brainstorm` | `plan` or the SDD skills (`flow:sdd-specify`, `flow:sdd-plan`, `flow:sdd-tasks`) |
| Turn a clarified idea into a scoped plan | `plan` | `deliver` |
| Execute a reviewed plan or next-ready task | `deliver` | `diff-review` |
| Review a branch or PR diff | `diff-review` | `pr-resolve` |
| Work through review feedback | `pr-resolve` | `pr-ready` |
| Decide if a branch is actually ready | `pr-ready` | `pr-publish` |
| Publish a ready branch as a PR | `pr-publish` | human review or `release` after merge |
| Capture a reusable lesson | `knowledge-save` | future planning and review workflows consume it advisory-only |
| Refresh stale, duplicate, or obsolete knowledge | `knowledge-refresh` | planning and review lookups prefer refreshed canonical artifacts |
| Debug a failing behavior or regression | `debug` | `knowledge-save` if the result is reusable |
| Run a post-incident analysis | `incident-rca` | follow-up planning or `knowledge-save` |

## Shared defaults and durable state

The plugin now documents one shared foundation for higher-level automation:

- `.flow/defaults.json` — repo-level workflow defaults. See
  `docs/workflow-defaults-contract.md`.
- `.flow/state.json` — durable workflow lifecycle state. See
  `docs/workflow-state-contract.md`.
- `.flow/artifacts/` — canonical local sink for generated
  workflow reports and summaries. Create local durable artifacts here by
  default, and commit them only when explicitly requested.

The first workflows that consume the shared defaults are:

- `plan` for planning sinks and discovery context;
- `deliver` for direct-execution report sinks and default
  post-delivery review-mode suggestions;
- `diff-review` for review-mode baseline and related guardrails;
- `pr-publish` for publish preferences and durable publish-summary
  sinks;
- `knowledge-save` for repo-default knowledge sinks;
- `knowledge-refresh` for knowledge-sink discovery, automation progression, and
  refresh-summary sinks.

When defaults are missing or only partially configured, those workflows keep
their existing fallback behavior. Durable workflow state is intentionally
separate from transient session continuity in `.agent/SESSION.md` and
`.agent/HANDOFF.json`. When a workflow needs a local durable artifact, it
should check `.flow/artifacts/` directly or follow the
artifact references recorded in `.flow/state.json`.

## The main composed loops

### 1. Clarified work to merge-aware closeout

Use this when the work is already clarified and you want one opt-in conductor to
own the lifecycle sequencing through post-publish closeout.

```text
idea-to-done
  -> brainstorm (only if needed)
  -> plan (only if needed)
  -> deliver
  -> diff-review
  -> pr-resolve (only if needed)
  -> pr-ready
  -> pr-publish
  -> merge monitoring / merge waiting-human (conductor-owned closeout)
  -> release (only if release-aware after merge)
  -> knowledge-save (optional)
  -> knowledge-refresh (optional, advisory or routed)
  -> completion summary (conductor-owned)
```

Notes:

- `idea-to-done` supports `manual`, `guided`, and `auto` modes.
- It updates `.flow/state.json` at major phase boundaries while
  it owns the lifecycle.
- It can resume from trusted durable state and artifacts, then choose one
  next-ready specialist phase instead of spawning a separate continuation-only
  workflow.
- It can continue after publication through merge monitoring, release-aware or
  non-release-aware closeout, optional knowledge capture or refresh, and one
  durable completion summary.
- It stops when requirements stay unclear, a human decision is required,
  readiness is not achieved, merge is still pending without a safe next step,
  or release/merge policy requires a separate step.
- It may recommend `knowledge-refresh` when stale, duplicate, or conflicting
  knowledge is observed, but refresh is never mandatory.
- Manual entry into the specialist workflows remains valid.

Continuation examples:

- **Resume after review comments** — trusted `review-needs-resolution` state
  routes back to `pr-resolve`.
- **Resume after failed readiness** — trusted `readiness-blocked` state routes
  back to implementation or clarification based on the readiness artifact.
- **Resume when publish still needs human action** — trusted
  `publish-waiting-human` state stops for the required human publish step even in
  `guided` or `auto` mode.
- **Published but not merged** — trusted `published` state plus an open PR
  routes to `merge-monitoring` or `merge-waiting-human`, not directly to release
  or knowledge work.
- **Merged in a release-aware repository** — trusted `merge-complete` evidence
  plus release expectations routes to `release` through
  `release-entry`.
- **Merged in a non-release-aware repository** — trusted merge evidence with no
  release requirement allows direct closeout toward knowledge capture or
  completion summary.

### 2. Specialist manual path for clarified idea to PR-ready branch

Use this when the work is feature-shaped and you want the normal delivery path.

```text
brainstorm (optional)
  -> plan / the SDD skills
  -> deliver
  -> diff-review
  -> pr-resolve
  -> pr-ready
  -> pr-publish
```

Notes:

- Start at `brainstorm` only if the idea is still fuzzy.
- `deliver` chooses direct implementation, parallel tracks, swarm, or debugging.
- When direct implementation is chosen, the route is expected to produce a
  durable direct-execution report plus a normalized review handoff for
  `diff-review`.
- `pr-publish` stops at commit / push / PR publication. It does not do release work.

### 3. Bug or regression to reusable lesson

Use this when the main problem is fault isolation rather than new feature delivery.

```text
debug
  -> diff-review (if code changed)
  -> pr-ready
  -> knowledge-save
```

Notes:

- If the fix attracts review feedback, insert `pr-resolve` before the final gate.
- `knowledge-save` is the right place for non-obvious debugging lessons that should survive the session.

### 4. Incident to follow-up change

Use this when the immediate need is understanding what happened, not just patching code.

```text
incident-rca
  -> plan
  -> deliver
  -> review / gate / publish
  -> knowledge-save
```

Notes:

- `incident-rca` explains the event.
- Planning and delivery own the corrective or preventative changes.

### 5. Large or uncertain execution

Use this when the work is too unclear or too coupled for fixed parallel tracks.

```text
plan
  -> deliver
  -> swarm
  -> diff-review
  -> readiness / publish
```

Notes:

- Reach for `swarm` only when decomposition itself is part of the problem.
- If task boundaries are already clear, `parallel-impl` is usually the better fit.

## Workflow reference

### Core loop workflows

| Workflow | Use it when | Do not use it when | Typical next step |
| --- | --- | --- | --- |
| `idea-to-done` | You want one opt-in workflow to carry clarified work across planning entry, delivery, review, readiness, publication, merge-aware closeout, and optional knowledge capture or refresh, including resume from trusted workflow state. | The request is still exploratory, purely release-shaped, or you only need one specialist phase. | the next owned specialist workflow, closeout step, or a documented stop-for-human boundary |
| `brainstorm` | The idea is still fuzzy and you need constraints, trade-offs, and risks surfaced before spec work. | Requirements are already clear or the task is a narrow bug fix. | `plan` or the SDD skills (`flow:sdd-specify`, `flow:sdd-plan`, `flow:sdd-tasks`) |
| `plan` | You need a durable plan, sequencing, validation, and execution handoff. | The change is already fully scoped and tiny. | `deliver` |
| `deliver` | You have accepted scope and want the best execution path chosen for you. | The request is still exploratory, review-shaped, or release-shaped. | direct implementation (with a durable direct-execution report), `parallel-impl`, `swarm`, or `debug` |
| `parallel-impl` | There are multiple independent ready tasks and you want disciplined parallel tracks on isolated external worktrees, with TDD and concise design-quality expectations kept explicit, and with same-agent continuation preferred over duplicate rescue tracks when work stalls. | Boundaries are unclear or tasks interact heavily. | human review on the created or updated PR |
| `swarm` | The work is large or uncertain enough that decomposition must happen at runtime, and you want the coordinator to prefer in-place continuation or escalation over duplicate rescue agents during convergence. | The task list is already clean and fixed. | `diff-review` |
| `diff-review` | You want a first-class diff review on a branch, PR, or commit range. | You are still implementing or you only need to resolve existing comments. | `pr-resolve` or `pr-ready` |
| `pr-resolve` | There are review comments or findings that need skeptical triage, verified fixes, replies, thread resolution, and usually a pushed branch update. | You need a first-pass review rather than comment resolution. | `pr-ready` |
| `pr-ready` | The branch is stable and you want an explicit ready / not-ready judgment, including an evidence-based check that the current diff still matches the PR intent. | The diff is still changing significantly. | `pr-publish` |
| `pr-publish` | The exact tree is ready and you need commit / push / PR creation or update. | Readiness is missing, stale, or the request is really about releasing. | human review or `release` after merge |
| `release` | Post-merge branch is ready for versioning, changelog, tagging, and optional release creation. | You only need to publish a PR. | release complete |
| `knowledge-save` | A completed workflow produced a reusable lesson worth preserving durably. | The work is still in progress or the task is a normal README/docs update. | future planning or review uses the artifact advisory-only |
| `knowledge-refresh` | Existing knowledge artifacts need maintenance — deduplication, staleness review, retirement, or gap identification. | The work is fresh capture from a just-completed workflow (use `knowledge-save`). | planning and review lookups prefer refreshed canonical artifacts |

### Specialist and support workflows

| Workflow | Use it when | Do not use it when | Typical next step |
| --- | --- | --- | --- |
| `map-codebase` | You need a clean factual orientation to the repository before planning or delivery. | You already know the exact files and boundaries. | `plan`, `arch-review`, or delivery |
| `arch-review` | You need design pressure-testing, ADR-like reasoning, or architecture trade-off review. | The work is just a small implementation slice. | planning, delivery, or explicit ADR follow-up |
| `debug` | The task is fault isolation, a failing test, or a regression investigation. | The work is primarily feature delivery. | `knowledge-save`, review, or a follow-up delivery workflow |
| `incident-rca` | You need post-incident causal analysis and a durable incident report. | You only need to fix a local bug quickly. | planning for follow-up changes or `knowledge-save` |
| `worktree` | You need worktree creation, validation, or cleanup for parallel tracks. | You are not actually running isolated parallel work. | `parallel-impl` |
| `e2e-tests` | A scoped feature needs end-to-end test coverage added deliberately. | You are still exploring the feature shape. | delivery, review, or readiness |
| `contracts` | You need a contract/schema/testable interface artifact generated from agreed scope. | The task is exploratory or the contract is already stable. | planning, implementation, or review |

## How to choose between the execution workflows

| If the work looks like... | Use |
| --- | --- |
| one tight task, one file or one small module | `deliver` -> direct implementation + direct-execution report |
| several independent ready tasks | `deliver` -> `parallel-impl` |
| a large change with unclear boundaries | `deliver` -> `swarm` |
| a failing behavior, regression, or reproducibility problem | `deliver` -> `debug` |

## What the higher-level conductor adds now

The plugin now has both:

- the **specialist workflows** for explicit phase-by-phase control; and
- one **opt-in conductor** for clarified work that wants lifecycle glue.

That means:

1. use `idea-to-done` when you want one bounded workflow to carry
   clarified work across the major phases;
2. use the specialist workflows directly when you want precise phase-by-phase
   control;
3. treat `knowledge-save` as conditional, not mandatory;
4. treat `knowledge-refresh` as optional and advisory — the conductor may
   recommend or route into it after significant completion events, but it never blocks
   lifecycle closure;
5. treat `.flow/state.json` as the durable authority for
   continuation, while `.agent/SESSION.md` and `.agent/HANDOFF.json` remain
   advisory session continuity only.
