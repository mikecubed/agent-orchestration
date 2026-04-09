---
name: delivery-orchestration
description: Route bounded delivery work to the best-fit specialist skill based on task shape, complexity, and available context.
---

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

- the request is about planning, specification, or ideation — route to `/workflow-orchestration:planning-orchestration` or `/workflow-orchestration:brainstorm-ideation` instead;
- the request is about reviewing an existing diff — route to `/workflow-orchestration:diff-review-orchestration`;
- the request is about releasing — route to `/workflow-orchestration:release-orchestration`.

## Project-Specific Inputs

Before you route, identify:

- the task list, plan reference, or change description that scopes the work;
- the repository's validation commands and quality gates;
- the integration branch and final review target;
- the number of ready tasks and whether they are independent or coupled;
- the current codebase factual brief or context facts (from a prior scout or `/workflow-orchestration:map-codebase` run), if available;
- whether `clean-code-codex:conductor` is loaded in the current session;
- the developer's concurrency and budget preferences, if stated.

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
| **direct** | Implementer agent (no orchestration skill) | Single task, single file or tight module, no parallelism needed, clear scope and tests |
| **parallel** | `/workflow-orchestration:parallel-implementation-loop` | ≥ 2 independent ready tasks touching different files or modules |
| **swarm** | `/workflow-orchestration:swarm-orchestration` | Decomposition is non-trivial, emergent coupling expected, or multiple specializations needed concurrently |
| **debug** | `/workflow-orchestration:systematic-debugging` | The request is a bug report, failing test, or regression investigation |
| **deflect** | See § Deflection Rules | Request is underspecified, out of scope, or belongs to a different workflow phase |

### Required rationale

For every routing decision, the coordinator must state:

1. the **input classification** (task reference, change description, bug report, or broad execution request);
2. the chosen **route outcome**;
3. a **one-sentence justification** explaining why this route fits the input shape;
4. any **inputs forwarded** to the downstream skill (task IDs, file lists, validation commands, factual brief).

Record the rationale in the delivery log or track report before delegating.

### Deflection rules

The coordinator deflects (does not attempt delivery) when any of the following are true:

- **No scope** — the request has no task list, plan reference, change description, or acceptance criteria. Deflect to `/workflow-orchestration:planning-orchestration`.
- **Ideation-shaped** — the request is exploratory, asks "should we…", or requests trade-off analysis without a committed direction. Deflect to `/workflow-orchestration:brainstorm-ideation`.
- **Review-shaped** — the request asks to review an existing diff, PR, or branch. Deflect to `/workflow-orchestration:diff-review-orchestration`.
- **Release-shaped** — the request asks about versioning, changelogs, or release tagging. Deflect to `/workflow-orchestration:release-orchestration`.
- **Missing context** — the repository has no factual brief, no validation commands, and the developer has not provided enough context to classify the work. Ask the developer for the missing inputs before routing.

When deflecting, state which deflection rule triggered, name the recommended skill, and stop. Do not partially execute the request.

## Invocation Matrix

Use this decision matrix to resolve the route outcome. Evaluate conditions top-to-bottom; the first matching row wins.

| # | Condition | Route | Example |
|---|-----------|-------|---------|
| 1 | Request is a bug report, failing test, or regression | **debug** | "The auth middleware returns 500 on refresh tokens" → `/workflow-orchestration:systematic-debugging` |
| 2 | Request lacks scope, plan, or acceptance criteria | **deflect → planning** | "Implement the new feature" (no plan, no tasks) → `/workflow-orchestration:planning-orchestration` |
| 3 | Request is exploratory or asks for trade-off analysis | **deflect → ideation** | "Should we use Redis or Memcached?" → `/workflow-orchestration:brainstorm-ideation` |
| 4 | Request asks to review a diff or PR | **deflect → review** | "Review my branch" → `/workflow-orchestration:diff-review-orchestration` |
| 5 | Request asks about versioning or release | **deflect → release** | "Tag a release" → `/workflow-orchestration:release-orchestration` |
| 6 | Decomposition is non-trivial: scope is large, boundaries unclear, or multiple specializations needed | **swarm** | "Audit and harden the auth subsystem across 3 domains" → `/workflow-orchestration:swarm-orchestration` |
| 7 | ≥ 2 independent ready tasks touching different files/modules | **parallel** | "Implement T003 (API routes) and T004 (UI components) in parallel" → `/workflow-orchestration:parallel-implementation-loop` |
| 8 | Single well-scoped task, one file or tight module | **direct** | "Add input validation to src/api/users.ts with tests" → direct implementer agent |

### Decision examples

**Example 1 — Direct implementation**

```text
Input: "Deliver T012: add the retry helper to src/utils/retry.ts with unit tests."
Classification: task reference (single task, single file)
Route: direct
Rationale: One task, one file, clear scope — no orchestration overhead needed.
Forwarded: task ID T012, file src/utils/retry.ts, validation: npm test -- test/utils/retry.test.ts
```

**Example 2 — Parallel implementation**

```text
Input: "Implement T005 (API validation) and T006 (database migration) — they're independent."
Classification: task reference (multiple independent tasks)
Route: parallel → /workflow-orchestration:parallel-implementation-loop
Rationale: Two independent tasks touching different modules — parallel tracks reduce wall time.
Forwarded: task IDs [T005, T006], track boundaries, validation commands per track
```

**Example 3 — Swarm orchestration**

```text
Input: "Refactor the payment subsystem — it spans 4 modules and I'm not sure where the boundaries are."
Classification: change description (large, boundary-uncertain)
Route: swarm → /workflow-orchestration:swarm-orchestration
Rationale: Decomposition is non-trivial; boundaries are emergent; multiple specializations likely needed.
Forwarded: goal description, relevant top-level modules, validation commands
```

**Example 4 — Systematic debugging**

```text
Input: "The /users endpoint returns 500 after the last deploy. I can't reproduce locally."
Classification: bug report
Route: debug → /workflow-orchestration:systematic-debugging
Rationale: Specific failure symptom, non-reproducible locally — needs structured fault isolation.
Forwarded: symptom description, affected endpoint, relevant files, reproduction attempts so far
```

**Example 5 — Deflection to planning**

```text
Input: "Build the notification system."
Classification: broad execution request (no plan, no task list, no acceptance criteria)
Route: deflect → /workflow-orchestration:planning-orchestration
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

If a factual brief or context facts already exist in the session or repository (e.g., from a prior `/workflow-orchestration:map-codebase` or scout run), reuse them. Do not re-run discovery when the facts are already available and current.

If no context exists and the request is non-trivial (more than a single well-scoped file change), run a lightweight scout pass to produce a factual brief before routing.

### 4. Evaluate the invocation matrix

Walk the invocation matrix top-to-bottom. The first matching row determines the route. Record the rationale (input classification, route, justification, forwarded inputs).

### 5. Delegate to the downstream skill

Invoke the chosen downstream skill with the forwarded inputs. The coordinator's job ends at delegation — it does not monitor or manage the downstream execution. The downstream skill owns its own progress tracking, rescue policy, and completion gates.

### 6. Record the routing decision

Before and after delegation, ensure the routing rationale is captured in a durable artifact — the track report, delivery log, or `.agent/SESSION.md`. Chat-only memory is not sufficient. Use the durable artifact conventions from `docs/workflow-artifact-templates.md`.

## Required Gates

### Routing gate

A routing decision is not valid until:

- the request was classified against one of the accepted input types;
- the deflection rules were evaluated and either none triggered or the deflection was executed;
- the invocation matrix was walked and a single route outcome was selected;
- the rationale (classification, route, justification, forwarded inputs) was recorded in a durable artifact.

### Delegation gate

Delegation is not valid until:

- the downstream skill is available in the current session;
- all required project-specific inputs for the downstream skill have been identified and forwarded;
- the routing rationale has been recorded.

If the downstream skill is not available, inform the developer and suggest manual invocation or an alternative skill.

## Stop Conditions

- the request cannot be classified after one clarifying question;
- a deflection rule fires (coordinator stops after deflecting);
- the required downstream skill is not available and no alternative exists;
- the developer asks to stop;
- required project-specific inputs are missing and the developer cannot provide them.

Before stopping, record the reason and any partial classification or context gathered so the developer can resume from a known state. Apply the rescue policy: narrow scope, request clarification, and offer one bounded retry before abandoning the routing attempt.

## Example

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
  6. Route: parallel → /workflow-orchestration:parallel-implementation-loop
     Rationale: Two independent track groups — parallel tracks reduce wall time while
     serializing the coupled pair.
  7. Forwarded: task IDs [T007, T008, T009], track definitions, validation commands,
     factual brief.
  8. Routing decision recorded in track report.
```
