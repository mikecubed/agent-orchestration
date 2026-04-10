# Workflow State Contract

This document defines the durable workflow-state artifact used to record the
latest lifecycle position of a workflow run without overloading transient
session continuity files.

## Purpose

Durable workflow state exists so a later workflow, conductor, or continuation
step can answer these questions without scraping chat history:

- what phase is the workflow in;
- whether the workflow is manual, guided, or auto-progressing;
- which durable artifacts represent the latest trusted outputs;
- what should happen next.

## Canonical file identity

The durable workflow-state artifact lives at one canonical root-relative path:

```text
.workflow-orchestration/state.json
```

This is a lifecycle artifact, not a session artifact.

## File format and version marker

The state file is machine-readable JSON:

```json
{
  "schema-version": "1.0",
  "workflow": "parallel-implementation-loop",
  "updated-at": "2026-04-09T23:30:00Z",
  "status": "active",
  "current-phase": "track-contracts-merged",
  "automation-mode": "guided",
  "next-action": "run integration validation",
  "workspace": {
    "branch": "feat/workflow-defaults-state-foundation-1-6",
    "target": "main"
  },
  "artifacts": {
    "track-report": "docs/track-report-workflow-defaults-1-6-contracts.md",
    "batch-summary": "docs/batch-summary-workflow-defaults-state-foundation-1-6.md"
  },
  "owner": {
    "kind": "workflow",
    "name": "parallel-implementation-loop"
  }
}
```

## Required fields

Every write must include:

- `schema-version`: string, currently `"1.0"`
- `workflow`: workflow name responsible for the current lifecycle
- `updated-at`: ISO-8601 timestamp
- `status`: `planned` | `active` | `blocked` | `complete` | `stale`
- `current-phase`: current lifecycle phase label
- `automation-mode`: `manual` | `guided` | `auto`
- `next-action`: the next recommended concrete step
- `artifacts`: object mapping artifact roles to durable references

`workspace` and `owner` are strongly recommended for coordination workflows in
this phase because they help later readers verify that the state matches the
expected branch and writer.

## Discovery rules

Readers use one canonical path: `.workflow-orchestration/state.json`.

- If the file is absent, the workflow must not infer completion from chat memory.
- If the file is malformed, unsupported, or stale, the workflow must stop unsafe
  progression and request human confirmation or regenerate trusted state from
  durable artifacts.
- Readers may use the referenced durable artifacts as supporting evidence, but
  the state file alone is not a substitute for review, readiness, or validation.

## Continuation intake and trust checks

Continuation readers must treat `.workflow-orchestration/state.json` as the
first durable checkpoint for deciding whether lifecycle progress can resume
safely. The state file is necessary context, but it is trusted only when the
supporting artifacts and workspace still line up.

Before a workflow continues from state, confirm all of the following:

- the schema version is supported;
- the current workflow is allowed to resume the recorded owner;
- the `workspace.branch` and `workspace.target` still match the active run;
- every artifact reference needed for the current phase still exists;
- readiness or publish artifacts still describe the exact tree being resumed or
  published.

Treat continuation as unsafe and stop auto-progression when any of those checks
fails.

## Reader and writer ownership

### Writers

Only the workflow that currently owns lifecycle coordination should write the
state file. In this phase that generally means:

- a top-level conductor or orchestration workflow when one exists;
- a multi-step coordinator such as `parallel-implementation-loop` when it is the
  active lifecycle owner;
- a top-level conductor such as `idea-to-done-orchestration` when it is
  explicitly resuming ownership.

Specialist skills must not silently overwrite shared workflow state just because
they were invoked locally. A workflow may update the state only when it is the
recognized owner of the current run.

### Readers

Any workflow may read the state file as advisory lifecycle context. Reading
state does not grant authority to skip the workflow's own gates.

## Artifact reference rules

`artifacts` stores durable pointers, not chat summaries. References should point
to committed files, PRs, issue comments, or other repository-appropriate durable
sinks.

At minimum, later workflows must be able to identify:

- the latest durable artifact for the current phase;
- the latest integrated summary or batch artifact when one exists.

Continuation-sensitive phases must keep enough artifact coverage to determine
the next-ready specialist handoff. In practice that means later readers should
be able to answer:

- what the latest trusted completed phase was;
- which artifact proves that phase completed;
- whether the next phase is review, resolution, readiness, publication, or
  lifecycle completion.

## Continuation boundary matrix

Use this matrix when deciding whether a lifecycle can resume and what the next
state write must contain.

| Boundary | Required `status` | Required `current-phase` | Minimum durable references | `next-action` expectation |
| --- | --- | --- | --- | --- |
| Resume assessment begins | `planned` \| `active` \| `blocked` | `resume-assessment` | state file plus latest artifact for the recorded phase being resumed | name the one next-ready specialist workflow or required clarification step |
| Resumed specialist entry | `active` | phase-specific in-progress boundary such as `delivery-in-progress` | artifact proving the previous phase completed | point at the next owned specialist action, not a vague resume note |
| Blocked or stale stop | `blocked` \| `stale` | `delivery-blocked`, `readiness-blocked`, `publish-waiting-human`, or `resume-stale` | blocking artifact or mismatch evidence | request the exact human action or regeneration needed before continuation |
| Human-gated publish | `blocked` | `publish-waiting-human` | readiness artifact for the exact publishable tree | wait for explicit human publish action |
| Lifecycle completion | `complete` | `knowledge-captured`, `knowledge-skipped`, or `published` when no knowledge capture is needed | final publish or knowledge artifact plus summary artifact when produced | close the lifecycle or point at optional knowledge capture only |

## Lifecycle

Expected lifecycle in this phase:

1. created when a workflow first produces a durable artifact worth resuming;
2. updated at meaningful phase boundaries, not every keystroke;
3. retained until the workflow is complete or explicitly superseded;
4. marked `stale` when its references no longer describe the current branch,
   artifact set, or lifecycle owner.

## Boundary-write rules

Writers must update the state only at meaningful owned boundaries. For
continuation this means:

1. write a resume-assessment boundary before routing into a resumed specialist
   workflow when the conductor is re-establishing trust;
2. write `stale` or `blocked` immediately when continuation fails a trust check;
3. do not retain a previously-passing readiness or publish state if later tree
   changes invalidate that evidence;
4. keep `next-action` concrete enough that the reader can route to one next
   ready step without scraping chat history.

## Stale-state handling expectations

Treat the state as stale when any of the following is true:

- referenced artifacts are missing;
- the branch or target recorded in `workspace` no longer matches the active run
  (**workspace mismatch**);
- `updated-at` predates a newer durable artifact that should have superseded it;
- `owner` no longer matches the workflow attempting to continue
  (**lifecycle-owner mismatch**);
- the schema version is unsupported;
- readiness or publish evidence no longer describes the exact current tree
  (**invalidated readiness or publish evidence**).

When state is stale, the workflow must stop unsafe auto-progression, surface the
reason, and ask for human confirmation or regeneration.

Changed-tree detection may use any trustworthy local evidence, including branch
name drift, comparison against the commit or PR reference named by the readiness
or publish artifact, or newer durable artifacts that supersede the prior state.

## Separation from transient session continuity

Durable workflow state is **not** the same thing as `.agent/SESSION.md` or
`.agent/HANDOFF.json`.

| Artifact | Purpose | Lifetime | Version-controlled |
|---|---|---|---|
| `.workflow-orchestration/state.json` | Durable lifecycle state for workflow continuation and artifact discovery | Cross-session, until superseded | Repository decision |
| `.agent/SESSION.md` | Human-readable session continuity for the current local work session | Session/runtime | No |
| `.agent/HANDOFF.json` | Machine-readable companion to `SESSION.md` for the current local work session | Session/runtime | No |

Session continuity may mention the active workflow state artifact, but it must
not replace or redefine it.
