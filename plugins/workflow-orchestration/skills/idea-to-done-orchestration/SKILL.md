---
name: idea-to-done-orchestration
description: Carry clarified work across planning entry, delivery, review, readiness, publication, and optional knowledge capture without replacing the specialist workflows.
---

## Purpose

Use this skill as the opt-in top-level conductor when a developer wants one
workflow to carry clarified work across the major existing phases of the
engineering loop.

This skill is a thin coordinator. It owns sequencing, progression mode, durable
workflow-state updates, and clear stop boundaries. It does **not** replace
ideation, planning, delivery, review, readiness, publication, release, or
knowledge workflows.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope
for this skill. Use a separate orchestration layer if persistent coordination is
needed.

## When to Use It

Activate when the developer asks for things like:

- "carry this clarified request through the whole loop"
- "take this from idea to done"
- "run the whole workflow with explicit stop points"
- "sequence planning, delivery, review, and publish for me"

Use this skill only when the work is already clarified enough to choose an entry
path safely. If the request is still exploratory and no bounded direction exists,
start with `/workflow-orchestration:brainstorm-ideation` or stop for
clarification.

Do **not** use this skill when:

- the developer only wants one specialist phase;
- the request is release-shaped rather than PR/publication-shaped;
- the workflow should resume a stale or ambiguous prior lifecycle without
  re-establishing trusted durable state first.

## Project-Specific Inputs

Before you start, identify:

- the clarified work request, accepted task list, or plan reference;
- the active branch and intended review target;
- the repository's validation commands and quality gates;
- the latest factual brief, shared context facts, or discovery artifact;
- whether planning already produced a durable artifact worth trusting;
- whether shared workflow defaults exist at
  `.workflow-orchestration/defaults.json` (see
  `docs/workflow-defaults-contract.md`);
- whether durable workflow state exists at `.workflow-orchestration/state.json`
  (see `docs/workflow-state-contract.md`);
- whether a downstream publish step should stop for human confirmation because
  `automation.stop-for-human` or local policy requires it;
- whether a durable knowledge sink is available if optional
  `knowledge-compound` capture is recommended.

When shared workflow defaults are present, consume only the keys relevant to the
conductor:

- `automation.progression` for the baseline progression mode;
- `automation.stop-for-human` for hard human-stop boundaries;
- `review.mode` for the default downstream diff-review mode suggestion;
- publish and artifact-sink preferences only when the downstream specialist
  workflow already supports them.

If any required input is missing, stop and get it first. Do not guess.

## Workflow

### 1. Build the conductor brief and verify the upstream contracts

Before sequencing work, verify the current run still sits on the expected
foundation:

1. confirm the `1.6.0` shared defaults and durable workflow-state contracts are
   the active lifecycle contracts for defaults and state;
2. confirm the `1.7.0` direct-execution handoff/report contract is the direct
   delivery output the conductor will rely on after `delivery-orchestration`;
3. create or reuse one factual brief that captures:
   - the task summary;
   - the ready entry artifacts;
   - validation commands;
   - scope boundaries;
   - known dependencies;
   - the current branch or comparison baseline.

If the direct-execution handoff or durable-state contract is absent, stale,
ambiguous, or contradicted by newer local work, rescue before continuation:

1. narrow the scope to the trusted surfaces;
2. regenerate the needed factual brief or artifact reference;
3. if trust still cannot be re-established, stop and surface the exact gap.

### 2. Resolve progression mode

The conductor supports exactly three progression modes:

| Mode | Meaning | Default behavior |
| --- | --- | --- |
| `manual` | phase-by-phase control | stop before every major next phase and wait for explicit developer confirmation |
| `guided` | bounded automation with explicit stop points | continue through safe phase boundaries, but stop at documented human gates |
| `auto` | highest automation allowed by current guardrails | continue through all safe boundaries until a documented hard stop or completion |

Resolve the active mode using this precedence order:

1. explicit developer input for the current invocation;
2. active workflow-state continuity for the same owned lifecycle, when safe;
3. `.workflow-orchestration/defaults.json`;
4. local fallback to `manual`.

Record the resolved mode in the durable state and in the conductor summary.

### 3. Choose the entry path

The conductor owns lifecycle sequencing, but it must still route into the right
specialist workflow:

1. **Ideation entry** — use `/workflow-orchestration:brainstorm-ideation` only
   when the request is still exploratory or trade-off shaped.
2. **Planning entry** — use `/workflow-orchestration:planning-orchestration`
   when there is no accepted plan, no durable planning artifact, or no trusted
   task breakdown yet.
3. **Delivery entry** — use `/workflow-orchestration:delivery-orchestration`
   only when the work is already clarified, planned enough, and execution-ready.

Manual entry into any specialist workflow remains valid. The conductor is an
opt-in convenience layer, not a replacement for those entry points.

### 4. Own lifecycle state and update it at major phase boundaries

While the conductor is the active lifecycle owner, it writes
`.workflow-orchestration/state.json` at meaningful phase boundaries only. It
must not rewrite the state on every minor action, and downstream specialist
workflows must not silently overwrite conductor-owned state.

#### State update matrix

| Boundary | Status | Current phase | Minimum artifact references | Next-action rule |
| --- | --- | --- | --- | --- |
| Conductor accepts ownership | `planned` or `active` | `entry-confirmed` | planning artifact if already known, else none | choose ideation, planning, or delivery entry |
| Ideation or planning selected | `active` | `planning-entry` | ideation note or planning reference when produced | complete planning or stop for clarification |
| Planning intentionally skipped | `active` | `planning-skipped` | trusted accepted task or prior plan reference | enter delivery |
| Delivery delegated | `active` | `delivery-in-progress` | planning artifact or accepted task reference | wait for delivery result and handoff |
| Delivery completes with non-empty diff | `active` | `delivery-complete` | direct-execution report, track report, or equivalent delivery artifact | enter diff review |
| Delivery completes with no-change or blocked result | `blocked` or `complete` | `delivery-no-change` or `delivery-blocked` | delivery artifact with explicit reason | stop or request narrower follow-up |
| Diff review accepts the delivered surface | `active` | `review-complete` | delivery artifact plus review report | enter readiness gate |
| Diff review requires fixes | `active` or `blocked` | `review-needs-resolution` | review report | route to `/workflow-orchestration:pr-review-resolution-loop` |
| Readiness passes | `active` | `readiness-passed` | readiness report | publish if policy allows, else stop for human |
| Readiness fails or remains partial | `blocked` | `readiness-blocked` | readiness report | stop with required remediation |
| Publication completes | `active` or `complete` | `published` | publish summary or PR reference | optionally recommend knowledge capture |
| Publication is deferred by policy | `blocked` | `publish-waiting-human` | readiness artifact | wait for explicit human action |
| Knowledge capture completes or is skipped | `complete` | `knowledge-captured` or `knowledge-skipped` | knowledge artifact if created | close the lifecycle with a final conductor summary |

Every write must include the required workflow-state fields from
`docs/workflow-state-contract.md`: schema-version, workflow, updated-at, status,
current-phase, automation-mode, next-action, and durable artifact references.

### 5. Sequence the specialist workflows without absorbing their jobs

Use the following lifecycle path when the work remains healthy:

```text
brainstorm-ideation (only if needed)
  -> planning-orchestration (only if needed)
  -> delivery-orchestration
  -> diff-review-orchestration
  -> pr-review-resolution-loop (only if needed)
  -> final-pr-readiness-gate
  -> pr-publish-orchestration
  -> knowledge-compound (optional)
```

Coordinator rules:

1. After `delivery-orchestration`, auto-enter
   `/workflow-orchestration:diff-review-orchestration` only when the delivered
   result produced a non-empty diff and the active mode allows safe progression.
2. After diff review, route to
   `/workflow-orchestration:pr-review-resolution-loop` only when findings or
   unresolved review items actually exist.
3. Do not invoke `/workflow-orchestration:pr-publish-orchestration` until
   `/workflow-orchestration:final-pr-readiness-gate` returns `ready` or
   `ready-with-follow-ups` for the exact tree being published.
4. Do not route release-shaped work into publication; hand off to
   `/workflow-orchestration:release-orchestration` instead.
5. Treat `/workflow-orchestration:knowledge-compound` as conditional and
   advisory, never mandatory.

### 6. Produce a durable conductor summary

At workflow completion — or at any hard stop that leaves a durable handoff —
emit one durable conductor summary using the `Conductor lifecycle summary`
template in `docs/workflow-artifact-templates.md`.

Because the shared defaults contract does not yet define a dedicated conductor
sink, use a repository-appropriate durable sink. For committed artifacts in this
repository, prefer `docs/conductor-summary-<topic>.md`. If another durable sink
is more appropriate, preserve the same field structure.

The summary should point at the final `.workflow-orchestration/state.json`
snapshot rather than duplicating the full state contract inline.

## Required Gates

A conductor run is not complete until:

- the upstream defaults/state and direct-execution contracts were verified or an
  explicit stop reason was recorded;
- one factual brief or trusted context summary exists for the lifecycle;
- the progression mode was resolved and recorded;
- the conductor updated `.workflow-orchestration/state.json` at every meaningful
  phase boundary it owned;
- every downstream step remained delegated to the existing specialist workflow
  rather than being reimplemented inside the conductor;
- a durable conductor summary or explicit blocked handoff summary was produced.

### Verification checklist

Before declaring the conductor pass complete, confirm ALL of the following:

- [ ] Upstream contracts verified — PASS / FAIL
- [ ] Progression mode resolved and recorded — PASS / FAIL
- [ ] State writes occurred only at owned phase boundaries — PASS / FAIL
- [ ] Manual specialist entry points remain valid — PASS / FAIL
- [ ] Durable conductor summary produced — PASS / FAIL

If any item is FAIL: surface the failing item, state the required next action,
and do not declare the lifecycle complete.

## Stop Conditions

- Requirements are still unclear or no safe entry path exists.
- A human decision is required by the current lifecycle boundary or
  `automation.stop-for-human`.
- Readiness has not been achieved for the exact tree that would be published.
- Release or merge policy demands a separate step outside the conductor's scope.
- Durable workflow state is stale, malformed, unsupported, or owned by another
  workflow in a way that makes auto-progression unsafe.
- Downstream rescue fails to re-establish a trusted handoff.
- The developer asks to stop.

Rescue policy: when the lifecycle stalls, narrow the scope, drop to a more
conservative progression mode, or return to the most recent trusted specialist
workflow. Do not silently skip gates or infer success-shaped state.

## Example

### Guided clarified-work entry

```text
Developer: /workflow-orchestration:idea-to-done-orchestration carry this
feature to a publish-ready result in guided mode

Coordinator:
  Clarified request: yes
  Trusted plan artifact: docs/plan-add-pagination.md
  Active mode: guided
  Shared defaults: automation.progression=guided, stop-for-human=[publish, merge, release]
  Durable state path: .workflow-orchestration/state.json

  -> Skipping ideation: requirements are already bounded.
  -> Skipping planning: accepted plan artifact already exists.
  -> Delegating execution to /workflow-orchestration:delivery-orchestration
  -> Delivery returned a non-empty diff and direct-execution report.
  -> Entering /workflow-orchestration:diff-review-orchestration
  -> No unresolved review findings remain.
  -> Entering /workflow-orchestration:final-pr-readiness-gate
  -> Readiness verdict: ready
  -> Stopping before publish because stop-for-human includes publish.

  Durable state updated at:
    - entry-confirmed
    - planning-skipped
    - delivery-complete
    - review-complete
    - readiness-passed
    - publish-waiting-human

  Durable conductor summary:
    docs/conductor-summary-pagination.md

  Next action:
    Developer may now invoke /workflow-orchestration:pr-publish-orchestration
    or re-run the conductor in a mode that still respects the same human-stop
    boundary.
```
