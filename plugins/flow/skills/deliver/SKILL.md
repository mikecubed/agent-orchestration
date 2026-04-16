---
name: deliver
description: Route bounded delivery work to the best-fit specialist skill based on task shape, complexity, and available context.
---

> References to plugin documentation files (e.g. `docs/workflow-artifact-templates.md`) refer to the plugin-level `docs/` directory (`../../docs/` relative to this file). Other `docs/` paths (such as artifact output destinations) refer to the target project.

## Purpose

Use this skill as the entry point for executing bounded delivery work — implementation, debugging, or complex decomposition — when the developer has an accepted plan, task list, or well-scoped change request and needs the right execution strategy chosen automatically.

This is a thin coordinator. It inspects the incoming request, classifies its shape, selects the best-fit downstream skill, and delegates. It does **not** perform implementation, planning, review, or release work itself.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "deliver this task"
- "implement these changes"
- "execute the next ready work from the plan"
- "route this work to the right workflow"

Also activate when:

- there is an accepted plan or task list and the next step is execution;
- the developer wants the coordinator to choose between parallel tracks, swarm, direct implementation, or debugging based on the work shape;
- the developer is unsure which execution skill fits a particular delivery request.

Do **not** activate when:

- the request is about planning, specification, or ideation — route to `/flow:plan` or `/flow:brainstorm` instead;
- the request is about reviewing an existing diff — route to `/flow:diff-review`;
- the request is about releasing — route to `/flow:release`.

## Project-Specific Inputs

Before you route, identify:

- the task list, plan reference, or change description that scopes the work;
- the repository's validation commands and quality gates;
- the integration branch and final review target;
- the number of ready tasks and whether they are independent or coupled;
- the current codebase factual brief or context facts (from a prior scout or `/flow:map-codebase` run), if available;
- whether `ccc:conductor` is loaded in the current session;
- the developer's concurrency and budget preferences, if stated;
- whether the repository declares shared workflow defaults (see `docs/workflow-defaults-contract.md`) — if present, consume `artifact-sinks.track-reports` as the default direct-report sink and `review.mode` as the baseline post-delivery review-mode suggestion. If either key is absent, fall back to the local behavior documented below.

If the request lacks a clear scope, task list, or acceptance criteria, **deflect** — do not guess. See § Deflection Rules below.

## Routing Contract

### Accepted inputs

The coordinator accepts any of the following as a delivery request:

1. **Task reference** — one or more task IDs from a plan or task list (e.g., "deliver T005 and T006").
2. **Change description** — a plain-language description of bounded work with clear acceptance criteria (e.g., "add pagination to the /users endpoint with tests").
3. **Bug or failure report** — a specific symptom, failing test, or error message that needs systematic investigation.
4. **Broad execution request** — a request to "implement the plan" or "deliver the next ready work" when an accepted plan exists in the session or repository.

### Allowed route outcomes

The coordinator must resolve every accepted request to exactly one of these outcomes:

| Outcome | Downstream skill | When to choose |
|---------|-----------------|----------------|
| **direct** | Runtime-native scoped implementer agent | One accepted task or bounded change slice, one file or tight module, clear acceptance criteria, and defined validation scope |
| **parallel** | `/flow:parallel-impl` | ≥ 2 independent ready tasks touching different files or modules |
| **swarm** | `/flow:swarm` | Decomposition is non-trivial, emergent coupling expected, or multiple specializations needed concurrently |
| **debug** | `/flow:debug` | The request is a bug report, failing test, or regression investigation |
| **deflect** | See § Deflection Rules | Request is underspecified, out of scope, or belongs to a different workflow phase |

### Required rationale

For every routing decision, the coordinator must state:

1. the **input classification** (task reference, change description, bug report, or broad execution request);
2. the chosen **route outcome**;
3. a **one-sentence justification** explaining why this route fits the input shape;
4. any **inputs forwarded** to the downstream skill (task IDs, file lists, validation commands, factual brief).

Record the rationale in the delivery log or track report before delegating.

### Direct execution contract

The direct lane is first-class only when **all** of the following are true:

1. exactly one accepted task, change slice, or bounded bug-fix implementation is in scope;
2. the changed surface is one file or one tight module boundary that does not need runtime decomposition;
3. acceptance criteria or definition of done are explicit enough for a single implementer to finish without inventing missing requirements;
4. validation commands or quality gates are known, even if they may later end in `partial` or `not-run`;
5. the work is not primarily debugging-shaped and does not already require multiple parallel tracks.

When the direct lane is selected, prepare one direct-execution packet for the
runtime-native scoped implementer agent. The packet must include:

- task or change summary;
- bounded file or module surface;
- acceptance criteria and known constraints;
- validation commands and quality gates;
- any reusable factual brief or context facts already known;
- the shared defaults consumed for this route — `artifact-sinks.track-reports`
  for the direct-execution report sink and `review.mode` for the default
  review-mode suggestion — or an explicit note that the route fell back to
  workflow-local behavior because those keys were absent.

The direct implementer must return a durable direct-execution outcome artifact
using the template in `docs/workflow-artifact-templates.md`. At minimum, that
artifact records:

- request summary and route rationale;
- changed files or the explicit no-change reason;
- validation commands;
- `Validation outcome: pass | fail | partial | not-run`;
- unresolved issues and rescue history;
- review handoff payload or skipped-review reason;
- next action.

If the work expands beyond the direct lane after delegation, do not silently
continue. Apply the rescue and reroute rules in
§ Direct-Route Rescue and Reroute Contract.

### Deflection rules

The coordinator deflects (does not attempt delivery) when any of the following are true:

- **No scope** — the request has no task list, plan reference, change description, or acceptance criteria. Deflect to `/flow:plan`.
- **Ideation-shaped** — the request is exploratory, asks "should we…", or requests trade-off analysis without a committed direction. Deflect to `/flow:brainstorm`.
- **Review-shaped** — the request asks to review an existing diff, PR, or branch. Deflect to `/flow:diff-review`.
- **Release-shaped** — the request asks about versioning, changelogs, or release tagging. Deflect to `/flow:release`.
- **Missing context** — the repository has no factual brief, no validation commands, and the developer has not provided enough context to classify the work. Ask the developer for the missing inputs before routing.

When deflecting, state which deflection rule triggered, name the recommended skill, and stop. Do not partially execute the request.

## Invocation Matrix

Use this decision matrix to resolve the route outcome. Evaluate conditions top-to-bottom; the first matching row wins.

| # | Condition | Route | Example |
|---|-----------|-------|---------|
| 1 | Request is a bug report, failing test, or regression | **debug** | "The auth middleware returns 500 on refresh tokens" → `/flow:debug` |
| 2 | Request lacks scope, plan, or acceptance criteria | **deflect → planning** | "Implement the new feature" (no plan, no tasks) → `/flow:plan` |
| 3 | Request is exploratory or asks for trade-off analysis | **deflect → ideation** | "Should we use Redis or Memcached?" → `/flow:brainstorm` |
| 4 | Request asks to review a diff or PR | **deflect → review** | "Review my branch" → `/flow:diff-review` |
| 5 | Request asks about versioning or release | **deflect → release** | "Tag a release" → `/flow:release` |
| 6 | Decomposition is non-trivial: scope is large, boundaries unclear, or multiple specializations needed | **swarm** | "Audit and harden the auth subsystem across 3 domains" → `/flow:swarm` |
| 7 | ≥ 2 independent ready tasks touching different files/modules | **parallel** | "Implement T003 (API routes) and T004 (UI components) in parallel" → `/flow:parallel-impl` |
| 8 | One well-scoped task or bounded slice, one file or tight module, explicit acceptance criteria, defined validation scope | **direct** | "Add input validation to src/api/users.ts with tests" → runtime-native scoped implementer agent |

### Decision examples

**Example 1 — Direct implementation**

```text
Input: "Deliver T012: add the retry helper to src/utils/retry.ts with unit tests."
Classification: task reference (single task, single file)
Route: direct
Rationale: One task, one file, clear scope — no orchestration overhead needed.
Forwarded: task ID T012, file src/utils/retry.ts, validation: npm test -- test/utils/retry.test.ts, direct report sink: .flow/artifacts/direct-execution-retry-helper.md, default review mode: report-only (from shared defaults or local heuristic)
```

**Example 2 — Parallel implementation**

```text
Input: "Implement T005 (API validation) and T006 (database migration) — they're independent."
Classification: task reference (multiple independent tasks)
Route: parallel → /flow:parallel-impl
Rationale: Two independent tasks touching different modules — parallel tracks reduce wall time.
Forwarded: task IDs [T005, T006], track boundaries, validation commands per track
```

**Example 3 — Swarm orchestration**

```text
Input: "Refactor the payment subsystem — it spans 4 modules and I'm not sure where the boundaries are."
Classification: change description (large, boundary-uncertain)
Route: swarm → /flow:swarm
Rationale: Decomposition is non-trivial; boundaries are emergent; multiple specializations likely needed.
Forwarded: goal description, relevant top-level modules, validation commands
```

**Example 4 — Systematic debugging**

```text
Input: "The /users endpoint returns 500 after the last deploy. I can't reproduce locally."
Classification: bug report
Route: debug → /flow:debug
Rationale: Specific failure symptom, non-reproducible locally — needs structured fault isolation.
Forwarded: symptom description, affected endpoint, relevant files, reproduction attempts so far
```

**Example 5 — Deflection to planning**

```text
Input: "Build the notification system."
Classification: broad execution request (no plan, no task list, no acceptance criteria)
Route: deflect → /flow:plan
Rationale: No accepted plan or scoped tasks — delivery cannot begin without scope.
Deflection rule: No scope.
```

## Workflow

### 1. Classify the incoming request

Read the developer's request and classify it as one of:

- task reference;
- change description;
- bug report;
- broad execution request.

If the classification is ambiguous, ask the developer one clarifying question before proceeding.

### 2. Check for deflection

Evaluate the deflection rules in order. If any rule triggers, state the rule, recommend the appropriate skill, and stop.

### 3. Gather or reuse context

If a factual brief or context facts already exist in the session or repository (e.g., from a prior `/flow:map-codebase` or scout run), reuse them. Do not re-run discovery when the facts are already available and current.

If no context exists and the request is non-trivial (more than a single well-scoped file change), run a lightweight scout pass to produce a factual brief before routing.

### 4. Evaluate the invocation matrix

Walk the invocation matrix top-to-bottom. The first matching row determines the route. Record the rationale (input classification, route, justification, forwarded inputs).

### 5. Delegate to the downstream execution path

Invoke the chosen downstream execution target with the forwarded inputs:

- for **parallel**, **swarm**, and **debug**, delegate to the named downstream skill;
- for **direct**, delegate to the runtime-native scoped implementer agent for the active environment (for example, the current coding agent running on the single-task slice) with the explicit direct-execution packet and the requirement to return the direct-execution outcome report defined above.

The coordinator's job ends at delegation — it does not monitor or manage the downstream execution. The downstream skill or scoped implementer agent owns its own progress tracking, rescue policy, and completion gates.

### 6. Record the routing decision

Before and after delegation, ensure the routing rationale is captured in a durable artifact — the direct-execution report, track report, delivery log, or `.agent/SESSION.md`. Chat-only memory is not sufficient. Use the durable artifact conventions from `docs/workflow-artifact-templates.md`.

## Direct-Route Rescue and Reroute Contract

If a chosen **direct** route stops fitting the work shape, rescue before
abandonment. Record every rescue action in the durable direct-execution report.

### Reroute triggers

Reroute or stop when any of the following becomes true:

- **Scope expansion** — the change surface grows beyond one tight module or splits into multiple independently executable slices.
- **Debugging signal** — the work turns into fault isolation, reproduction, or regression analysis rather than bounded implementation.
- **Missing decision** — one required requirement, acceptance criterion, or product decision is still undefined.
- **Validation ambiguity** — the route cannot identify the validation surface needed to judge completion safely.

### Rescue order

Apply this sequence in order:

1. **Narrow once** — trim the request back to one safe direct slice if a smaller
   route is obvious and accepted by the available scope.
2. **Reroute by shape**:
   - to `/flow:parallel-impl` when the work
     splits into multiple independent ready slices;
   - to `/flow:swarm` when decomposition or
     coupling is non-trivial;
   - to `/flow:debug` when the work is really a
     bug, regression, or fault-isolation task.
3. **Return to planning** — if the route is blocked by a missing decision or
   unsafe ambiguity, send the work to `/flow:plan`
   or ask one clarifying question when the gap is truly singular.
4. **Stop explicitly** — if no safe reroute exists, stop with a durable artifact
   that records the blocking reason, current validation state, and recommended
   next action.

### Direct-route rescue example

```text
Input: "Add validation to src/api/users.ts."
Initial route: direct

During execution:
  - the implementer discovers that the API contract, DB schema, and frontend form
    must all change together.

Rescue result:
  - trigger: scope expansion
  - action: reroute → /flow:parallel-impl
  - rationale: the work is no longer one bounded direct slice
  - direct-execution report state: rerouted
  - Validation outcome: not-run
  - Next action: split the new slices into explicit tracks and continue through
    the parallel implementation loop
```

## Required Gates

### Routing gate

A routing decision is not valid until:

- the request was classified against one of the accepted input types;
- the deflection rules were evaluated and either none triggered or the deflection was executed;
- the invocation matrix was walked and a single route outcome was selected;
- the rationale (classification, route, justification, forwarded inputs) was recorded in a durable artifact.

### Delegation gate

Delegation is not valid until:

- the downstream execution target is available in the current session or runtime;
- all required project-specific inputs for the downstream skill have been identified and forwarded;
- the routing rationale has been recorded.

If the downstream skill or scoped implementer agent is not available, inform the developer and suggest manual invocation or an alternative supported route.

## Stop Conditions

- the request cannot be classified after one clarifying question;
- a deflection rule fires (coordinator stops after deflecting);
- the required downstream skill is not available and no alternative exists;
- the developer asks to stop;
- required project-specific inputs are missing and the developer cannot provide them.

Before stopping, record the reason and any partial classification or context gathered so the developer can resume from a known state. Apply the rescue policy: narrow scope, request clarification, and offer one bounded retry before abandoning the routing attempt.

## Post-Delivery Handoffs

After the downstream skill completes its work, the coordinator recommends — but does not enforce — the appropriate next workflow phase. The coordinator's responsibility ends at the recommendation; it does not invoke or monitor the follow-up skill.

### Default review handoff

When the downstream execution concludes with a non-empty diff, the coordinator
recommends routing the completed work into
`/flow:diff-review` as the default follow-up.
This is the standard next step for any delivery that produced code changes. A
`fail`, `partial`, or `not-run` validation outcome does not erase the handoff;
it must be passed through explicitly so the next actor can decide whether to fix
before or during review.

The handoff recommendation must include:

1. the **diff surface** — branch name, commit range, or PR reference covering the delivered work;
2. the **validation outcome** — the downstream skill's own validation result, using the normalized tokens `pass`, `fail`, `partial`, or `not-run`;
3. the **direct-execution report, track report, or delivery log** reference — so the reviewer has traceability back to the routing decision and delivered scope;
4. a **mode suggestion** — use the configured default review mode when shared workflow defaults declare `review.mode`; otherwise suggest `interactive` for complex or high-risk changes and `report-only` for routine or well-tested deliveries.

If the delivery produced a non-empty diff — code, tests, configuration, or documentation — keep the default review handoff. Skip the review handoff only when the downstream skill produced no changes and note the reason.

### Reusable-learning handoff

When the delivery outcome contains a durable, reusable lesson — a non-obvious debugging insight, an unexpected dependency interaction, a configuration pattern worth preserving, or a resolution that future contributors would benefit from — the coordinator recommends routing the lesson into `/flow:knowledge-save`.

This handoff is **conditional**, not automatic. Recommend it only when the delivery produced knowledge that:

- is not already captured in existing documentation or knowledge artifacts;
- would be useful beyond the current task or session;
- is specific enough to be actionable (not a general best practice).

The handoff recommendation must include:

1. the **source type** — the downstream skill that produced the knowledge (e.g., `debug`, `parallel-impl`);
2. the **source references** — links to the delivery session, commits, or track report;
3. a **summary** — a brief description of what was learned;
4. a **sink suggestion** — a proposed location for the knowledge artifact, following the repository's conventions.

If no durable reusable lesson emerged from the delivery, do not recommend this handoff. Routine implementations that follow established patterns do not qualify.

### Handoff sequence

When both handoffs apply, recommend them in this order:

1. **Review first** — `/flow:diff-review` to validate the delivered code.
2. **Knowledge capture second** — `/flow:knowledge-save` to extract any reusable lessons after the review confirms the work is sound.

This ordering ensures knowledge is captured from reviewed, validated work rather than from a potentially incomplete delivery.

## Deflection Behavior

The coordinator must not attempt delivery when the request belongs to a different workflow phase. The deflection rules in § Routing Contract define the triggers; this section provides additional guidance on recognizing and handling deflection scenarios.

### Recognizing underspecified requests

A request is underspecified when it lacks enough information to classify against the invocation matrix. Common signals:

- no task IDs, plan reference, or change description;
- no acceptance criteria or definition of done;
- scope described only in terms of outcomes ("make it faster") without concrete targets;
- the request assumes context that is not present in the session or repository.

When the coordinator detects underspecification, it deflects to `/flow:plan` with a brief explanation of what is missing. It does not attempt partial delivery or guess at scope.

### Recognizing ideation-shaped requests

A request is ideation-shaped when it explores possibilities rather than committing to a direction. Common signals:

- phrased as a question: "should we…", "what if we…", "which approach…";
- asks for trade-off analysis, comparison, or option enumeration;
- seeks validation of an idea rather than execution of a decision.

When the coordinator detects an ideation-shaped request, it deflects to `/flow:brainstorm` and states which signal triggered the deflection.

### Deflection examples

**Example — Underspecified request**

```text
Input: "Build the notification system."
Classification: broad execution request
Deflection rule: No scope — no plan, no task list, no acceptance criteria.
Action: deflect → /flow:plan
Message: "This request has no accepted plan, task list, or scoped acceptance
  criteria. Route to /flow:plan to produce
  a delivery-ready plan before returning here."
```

**Example — Ideation-shaped request**

```text
Input: "Should we use WebSockets or SSE for the live updates?"
Classification: not a delivery request
Deflection rule: Ideation-shaped — asks for comparison without a committed direction.
Action: deflect → /flow:brainstorm
Message: "This is an exploratory trade-off question, not bounded delivery work.
  Route to /flow:brainstorm for structured analysis."
```

**Example — Release-shaped request**

```text
Input: "Bump the version to 2.0 and update the changelog."
Classification: not a delivery request
Deflection rule: Release-shaped — asks about versioning and changelog.
Action: deflect → /flow:release
Message: "Version bumps and changelog updates belong to the release workflow.
  Route to /flow:release."
```

**Example — Review-shaped request**

```text
Input: "Check my PR for issues before I merge."
Classification: not a delivery request
Deflection rule: Review-shaped — asks to review an existing diff.
Action: deflect → /flow:diff-review
Message: "This is a review request, not delivery work. Route to
  /flow:diff-review."
```

## Coordinator-Shape Contract

This skill is a thin coordinator. The following invariants define its boundaries and must hold across all future changes:

### What this skill does

- Classifies incoming requests against the accepted input types.
- Evaluates deflection rules and stops when one fires.
- Walks the invocation matrix to select a single route outcome.
- Records the routing rationale in a durable artifact.
- Delegates to exactly one downstream skill per request.
- Recommends post-delivery handoffs (review, knowledge capture) without invoking them.

### What this skill does not do

- **No implementation** — it never writes, modifies, or deletes code, tests, configuration, or documentation. All implementation belongs to the downstream skill.
- **No planning** — it does not produce plans, specifications, task lists, or scope definitions. Planning belongs to `/flow:plan` and optionally the SDD skills (`flow:sdd-specify`, `flow:sdd-plan`, `flow:sdd-tasks`).
- **No review** — it does not review diffs, PRs, or code quality. Review belongs to `/flow:diff-review` and the review chain.
- **No release** — it does not bump versions, update changelogs, create tags, or publish artifacts. Release belongs to `/flow:release`.
- **No monitoring** — it does not track the progress of downstream skills after delegation. The downstream skill owns its own progress, rescue policy, and completion gates.
- **No knowledge capture** — it does not extract or write knowledge artifacts. Capture belongs to `/flow:knowledge-save`.

### Boundary test

Any proposed change to this skill should pass these questions:

1. Does the change add behavior that an existing downstream skill already owns? → If yes, do not add it here; route to that skill instead.
2. Does the change require this skill to persist state across multiple delegations? → If yes, this skill is growing beyond coordinator shape; reconsider the design.
3. Does the change make this skill invoke more than one downstream skill per request? → If yes, the request should be decomposed or routed to `/flow:swarm`.

## Example

### Routing and delegation

```text
Developer: "Deliver the next ready tasks from the plan."

Coordinator:
  1. Classification: broad execution request
  2. Deflection check: plan exists in .sdd/feature-abc/tasks.md — no deflection.
  3. Context: reusing factual brief from earlier map-codebase run.
  4. Ready tasks: T007 (src/api/routes.ts), T008 (src/db/migrations/), T009 (src/api/routes.ts).
     T007 and T009 share the same file — serialize them.
     T008 is independent.
  5. Matrix evaluation:
     - Not a bug → skip row 1
     - Has scope → skip row 2
     - Not exploratory → skip row 3-5
     - Decomposition is straightforward → skip row 6
     - 2 independent tracks (T007+T009 serial, T008 parallel) → row 7 matches
  6. Route: parallel → /flow:parallel-impl
     Rationale: Two independent track groups — parallel tracks reduce wall time while
     serializing the coupled pair.
  7. Forwarded: task IDs [T007, T008, T009], track definitions, validation commands,
     factual brief.
  8. Routing decision recorded in track report.
```

### Post-delivery handoff

```text
Downstream skill signals: all three tasks delivered, validation passing.

Coordinator post-delivery recommendation:
  1. Review handoff → /flow:diff-review
     Diff surface: feat/feature-abc against main
     Validation outcome: pass
     Direct-execution report / track report: .flow/artifacts/track-report-feature-abc.md
     Mode suggestion: interactive (multiple files across two modules)

  2. Knowledge capture handoff → /flow:knowledge-save
     (Conditional — only if the delivery produced a reusable lesson.)
     In this case: the parallel track discovered that T007 and T009 required
     serialization despite appearing independent — this file-coupling heuristic
     is worth capturing.
     Source type: parallel-impl
     Source references: track report, commits on feat/feature-abc
     Summary: "Tasks touching the same file must be serialized even when their
       logical scopes are independent."
     Sink suggestion: docs/knowledge/ (per repository convention)
```

### Full delivery loop

The recommended default loop for bounded delivery work:

```text
1. /flow:plan
   → Produces an accepted plan with scoped tasks and acceptance criteria.

2. /flow:deliver
   → Routes the ready tasks to the best-fit execution skill.

3. /flow:diff-review
   → Reviews any non-empty delivered diff (default post-delivery handoff).

4. /flow:knowledge-save
   → Captures any durable reusable lessons (conditional post-delivery handoff).
```
