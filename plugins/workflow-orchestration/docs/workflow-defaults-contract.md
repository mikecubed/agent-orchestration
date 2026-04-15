# Workflow Defaults Contract

This document defines the shared repo-level defaults contract for
`workflow-orchestration`. It gives repositories one narrow place to declare
baseline workflow behavior without editing individual skill prompts.

## Purpose

Use workflow defaults to declare repo-level policy for:

- durable artifact sinks;
- preferred review mode;
- automation guardrails;
- knowledge-capture behavior;
- publish defaults.

The contract is intentionally small. It defines defaults and override rules, not
the full behavior of each workflow.

## Canonical file identity

For milestone `1.6.0`, the defaults file is discovered at one canonical
root-relative path:

```text
.workflow-orchestration/defaults.json
```

There is no multi-path lookup order in this phase. A missing file means the
repository has not declared shared workflow defaults, so each workflow falls
back to its documented local behavior.

## File format and version marker

The defaults file is machine-readable JSON:

```json
{
  "schema-version": "1.0",
  "artifact-sinks": {
    "planning": "docs/",
    "track-reports": ".workflow-orchestration/artifacts/",
    "readiness-reports": ".workflow-orchestration/artifacts/",
    "publish-summaries": ".workflow-orchestration/artifacts/",
    "knowledge": "docs/knowledge/"
  },
  "review": {
    "mode": "interactive"
  },
  "automation": {
    "progression": "manual",
    "stop-for-human": ["publish", "merge", "release"]
  },
  "knowledge": {
    "capture": "explicit",
    "lookup": "advisory"
  },
  "concurrency": {
    "max-parallel-tracks": 2,
    "rescue-min-stall-checks": 3
  },
  "publish": {
    "target-branch": "main",
    "draft-pr": false
  }
}
```

`schema-version` is required. All other keys are optional and may be partially
specified.

## Key groups

### `artifact-sinks`

Maps workflow artifact categories to their default durable sink.

Supported keys in this phase:

- `planning`
- `track-reports`
- `readiness-reports`
- `publish-summaries`
- `knowledge`

Each value is a root-relative path string. Directory values are normalized by
the owning workflow using that workflow's existing artifact template and file
naming convention. The contract does **not** require one global directory
taxonomy; it only gives the repository a shared default starting point.

When a repository wants local workflow artifacts to stay discoverable without
being committed, prefer an explicit canonical path such as
`.workflow-orchestration/artifacts/`. Workflows can inspect that directory
directly even when the artifacts are not staged.

In this phase, `track-reports` covers both traditional implementation track
reports and `delivery-orchestration` direct-execution outcome reports when the
delivery route stays direct. The artifact shape may differ, but the shared sink
category is the same unless a workflow documents a narrower local override.

If a sink key is missing, the workflow falls back to its skill-local documented
sink behavior. For example, `knowledge-compound` may still require an explicit
sink when no repo default is configured.

### `review`

Defines repo-level review preferences shared by review-shaped workflows.

Supported keys in this phase:

- `mode`: `interactive` | `report-only` | `headless`

If omitted, review workflows use their existing documented mode selection and
developer prompts.

### `automation`

Defines whether workflows stay manual or may advance with bounded automation.

Supported keys in this phase:

- `progression`: `manual` | `guided` | `auto`
- `stop-for-human`: array of lifecycle boundaries that must never advance
  without explicit human confirmation

Phase `1.6.0` documents these values as guardrails only. They do not grant
unsafe implicit autonomy to any workflow.

### `knowledge`

Defines knowledge-capture defaults that remain advisory rather than mandatory.

Supported keys in this phase:

- `capture`: `explicit` | `suggested`
- `lookup`: `advisory`

This group must not impose a mandatory taxonomy. A repository may define a
default sink through `artifact-sinks.knowledge`, but individual invocations may
still override it or require explicit confirmation when the workflow needs one.

### `concurrency`

Defines hard caps on parallel agent execution and rescue behavior shared by
parallelism-capable workflows that explicitly consume these defaults
(`parallel-implementation-loop`, `pr-review-resolution-loop`).

Supported keys in this phase:

- `max-parallel-tracks`: integer, maximum number of concurrent implementer
  agents the coordinator may have running at once. Tracks beyond this limit
  are queued and launched as slots free up. Default: `2`.
- `rescue-min-stall-checks`: integer, minimum number of consecutive
  coordinator checks with no visible progress before a track may be
  considered stalled. Default: `3`.

If omitted, workflows use their baked-in defaults (`max-parallel-tracks: 2`,
`rescue-min-stall-checks: 3`).

The developer may override the cap for a single invocation by stating an
explicit maximum (e.g., "use at most 4 parallel tracks"). Explicit developer
input always takes precedence per the override rules below.

### `publish`

Defines repo-level publication defaults.

Supported keys in this phase:

- `target-branch`: default PR base branch
- `draft-pr`: boolean default for PR creation

If omitted, publish workflows fall back to the target branch inferred from the
repo or developer input, and they use the workflow-local default PR behavior.

## Override precedence

When a workflow resolves a value, use this precedence order:

1. explicit developer input for the current invocation;
2. continuation-specific context already locked into the active workflow state,
   but only when the workflow is explicitly resuming that same lifecycle;
3. `.workflow-orchestration/defaults.json`;
4. the workflow's documented local fallback behavior.

Workflows must consume only the keys relevant to them. Missing keys do not make
the whole config invalid.

## Fallback behavior

- Missing defaults file: continue normally with workflow-local defaults.
- Missing key group: continue normally for that concern.
- Missing individual key: use the fallback for just that key.
- Partial config: use the configured keys and fall back for the rest.
- Unknown keys: ignore them without failing the workflow.

## Artifact sink normalization rules

The defaults file records shared sink intent, not one fixed repository layout.

Normalization rules:

1. a directory path such as `.workflow-orchestration/artifacts/` means "write the workflow's normal artifact
    file into this directory";
2. a file path means "use this exact durable sink" when the artifact shape is
   singular for that workflow;
3. the owning workflow still chooses the final filename when the sink value is a
   directory;
4. workflows may reject a sink that conflicts with their own artifact contract,
   but they must surface that rejection explicitly and fall back rather than
   silently dropping output.

## Invalid-config handling boundaries

Malformed or unsupported config must not create silent success-shaped behavior.

- If the file cannot be parsed as JSON, treat the whole defaults file as
  unavailable for that invocation and fall back to workflow-local behavior.
- If `schema-version` is missing or unsupported, treat the whole file as
  unavailable and do not auto-progress from it.
- If a known key has the wrong type or an unsupported enum value, ignore that
  key only, record the mismatch in the workflow's durable artifact when
  practical, and fall back for that key.
- Do not coerce complex values silently.
- Unknown keys are ignored.

The workflow may continue when defaults are invalid, but only in the same safe
mode it would use if the file were absent.

## Ownership

The repository owns the defaults file. Workflow skills read it when present;
they do not invent or rewrite the file during normal execution in this phase.

## Relationship to durable workflow state

Workflow defaults are static repo policy. Durable workflow state records the
current lifecycle position of a specific workflow run. They are related, but
they are not the same artifact and must not be merged.
