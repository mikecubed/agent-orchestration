# Workflow Artifact Templates

Use this document when you want a durable artifact for one of the shared workflow loops in this repository. These templates are intentionally repo-level and generic: they define the field shape for workflow outputs that would otherwise live only in chat, even when the final durable sink is a local on-disk artifact or another durable reference.

## Where to store artifacts

For local durable workflow artifacts in this repository:

- store them under `.workflow-orchestration/artifacts/`;
- prefer descriptive names over ad hoc notes;
- keep one file per coherent output;
- create them when a workflow calls for a durable local artifact;
- do not stage or commit them unless explicitly requested.

Suggested names:

- `.workflow-orchestration/artifacts/direct-execution-<topic>.md`
- `.workflow-orchestration/artifacts/track-report-<topic>.md`
- `.workflow-orchestration/artifacts/review-resolution-<topic>.md`
- `.workflow-orchestration/artifacts/readiness-report-<topic>.md`
- `.workflow-orchestration/artifacts/publish-summary-<topic>.md`
- `.workflow-orchestration/artifacts/conductor-summary-<topic>.md`
- `.workflow-orchestration/artifacts/completion-summary-<topic>.md`
- `.workflow-orchestration/artifacts/refresh-summary-<topic>.md`
- `.workflow-orchestration/artifacts/batch-summary-<topic>.md`

This dot-directory is the canonical local discovery path for workflow-generated
reports and summaries. When a workflow needs prior durable local artifacts, it
should inspect `.workflow-orchestration/artifacts/` directly or follow an
explicit reference from `.workflow-orchestration/state.json` rather than
depending on a broad repo-wide search.

If this repository uses another durable sink for a workflow output — for example, a PR description, issue comment, or task tracker entry — reuse the same field structure from the matching template below.

If the output is temporary or session-only, keep it out of the repository.

## Parallel implementation track report

Use for `parallel-implementation-loop`.

```text
Track: <track-name>
Tasks: <task-id-1>, <task-id-2>
Files: <path>, <path>
Dependencies: <dependency status>
Validation: <command>
Work surface: <branch or worktree path>
State: pending | active | review | revision | merged | rescue | serialized | escalated | blocked | abandoned
Validation outcome: pass | fail | partial | not-run
Unresolved issues:
- <open issue, or none>
Rescue history:
- <trigger> | <action> | <rationale> | <outcome> | <attempt number>, or none
Next action: <what should happen next for this track>
Revision rounds: <count of implementer-reviewer revision cycles completed, or 0>
Summary: <short summary of what changed>
Follow-ups: <remaining risks or next steps>
```

## Direct execution outcome report

Use for `delivery-orchestration` when the selected route is **direct**.

```text
Request: <task ID or change description>
Route rationale: <why direct was selected>
Scope: <single task / one file / tight module>
Files: <path>, <path>
Forwarded context:
- <acceptance criteria / factual brief / defaults consumed>, or none
Validation:
- <command>, or none
Validation outcome: pass | fail | partial | not-run
Current state: delegated | implementing | complete | rerouted | stopped | no-change
Diff surface: <branch / commit range / PR ref, or none — reason>
Artifact sink: <.workflow-orchestration/artifacts/direct-execution-<topic>.md or another durable sink>
Review handoff:
- <diff surface> | <validation outcome> | <artifact reference> | <mode suggestion>, or skipped — <reason>
Unresolved issues:
- <open issue, or none>
Rescue history:
- <trigger> | <action> | <rationale> | <outcome> | <attempt number>, or none
Next action: <what should happen next>
Summary: <short summary of what changed or why the route was rerouted/stopped>
```

When shared workflow defaults declare `artifact-sinks.track-reports`, use that
sink as the default location for this report. When shared defaults declare
`review.mode`, use it as the baseline review-mode suggestion unless the current
invocation already provided an explicit override.

## Review-resolution summary

Use for `pr-review-resolution-loop`.

```text
Review surface: <branch or PR> against <target>
Reviewer source: <GitHub review / Azure DevOps PR review / comments / local review>
Current state: triage | fixing | validating | done
Decisions:
- <comment-id> | <correctness / security / test / contract / architecture / stale> | <fixed / declined / clarify first> | <short rationale>
Validation:
- <command>
Result:
- <pass / fail / partial>
Remaining concerns:
- <open blocker or intentional follow-up, or none>
Unresolved questions:
- <question requiring developer input, or none>
Next action: <what should happen next for this review cycle>
```

## Final readiness report

Use for `final-pr-readiness-gate`.

```text
Review surface: <branch or PR> against <target>
Structured checker: <tool or none>
Current state: scanning | fixing | re-checking | done
Blockers:
- <blocker, or none>
Fix-now:
- <fix-now item, or none>
Follow-ups:
- <follow-up item, or none>
Skipped checks:
- <reason, or none>
Unresolved questions:
- <question requiring developer input, or none>
Next action: <what should happen next for this readiness check>
Verdict:
- <ready for review / ready with follow-ups / not ready / stopped by user>
```

## Publish summary

Use for `pr-publish-orchestration`.

```text
Publication request: <source branch> against <target branch>
Readiness source: <final-pr-readiness-gate verdict for the exact tree being published>
Supporting readiness context:
- <diff-review report / CI state / other supporting evidence, or none>
Current state: validating | committing | pushing | publishing | done | stopped
Commits published:
- <short SHA> <subject>, or none
PR action:
- <created #123 | updated #123 | not-run — reason>
Skipped steps:
- <step> — <reason>, or none
Deflected concerns:
- <request> -> <skill handoff>, or none
Artifact sink: <.workflow-orchestration/artifacts/publish-summary-<topic>.md or another durable sink>
Next action: <what should happen next>
```

## Conductor lifecycle summary

Use for `idea-to-done-orchestration`.

```text
Request: <clarified work request or accepted task bundle>
Progression mode: manual | guided | auto
Lifecycle owner: idea-to-done-orchestration
State file: .workflow-orchestration/state.json
Entry path: <brainstorm-ideation | planning-orchestration | delivery-orchestration>
Current state: planned | active | blocked | complete | stale
Phase history:
- <phase> | <specialist workflow used> | <durable artifact reference> | <result>
Stop decisions:
- <phase> | <reason> | <required human input>, or none
Final artifacts:
- planning: <artifact or none>
- delivery: <artifact or none>
- review: <artifact or none>
- readiness: <artifact or none>
- publish: <artifact or none>
- completion: <artifact or none>
- knowledge: <artifact or none>
Artifact sink: <.workflow-orchestration/artifacts/conductor-summary-<topic>.md or another durable sink>
Next action: <what should happen next>
Summary: <short summary of the lifecycle outcome>
```

## Completion summary

Use for final post-merge closeout in `idea-to-done-orchestration`.

```text
Request: <clarified work request or accepted task bundle>
Lifecycle owner: idea-to-done-orchestration
State file: .workflow-orchestration/state.json
Shipped outcome: <merged | merged with follow-ups | partial closeout | blocked closeout>
Merge status: <published but not merged | merge-monitoring | merge-waiting-human | merged>
Release disposition: <not-required | release-entry | completed | blocked | skipped>
Knowledge steps:
- capture: <artifact or none>
- refresh: <artifact or recommendation or none>
Final references:
- publish: <artifact or none>
- merge: <artifact or none>
- release: <artifact or none>
- knowledge: <artifact or none>
Unresolved follow-ups:
- <follow-up> | <owner or sink> | <reason>, or none
Artifact sink: <.workflow-orchestration/artifacts/completion-summary-<topic>.md or another durable sink>
Next action: <what should happen next>
Summary: <short summary of the shipped outcome and any remaining obligations>
```

## Discovery brief

Use when a workflow skill needs to prepare factual context before delegating to expensive specialists. The coordinator or a fast scout-tier model produces one discovery brief per batch or session.

```text
Task summary: <one-paragraph description of the work>
Task shape: single-track | multi-track-batch | review-resolution-batch | large-diff-readiness
Relevant files: <path>, <path>
Task boundaries: <what is in scope and what is not>
Validation commands: <command>, <command>
Dependencies: <known dependencies or shared interfaces, if multi-track>
Comparison baseline: <branch, commit, or PR reference, if review or readiness>
Prior-learnings consulted:
- <path or reference> — <one-line summary>
or <none-found | skipped>
Open questions: <questions requiring developer input, or none>
Skip reason: <if discovery was skipped, why — e.g., "single file, fully scoped bug fix">
```

**Prior-learnings lookup**: When the workflow supports prior-learning reuse (e.g., `planning-orchestration`, `diff-review-orchestration`), record the lookup result in the `Prior-learnings consulted` field. When matches are found, list each artifact as a one-line bullet with its path or reference and a short summary. Use `none-found` when the lookup ran but returned no matches, and `skipped` when the lookup was not performed (e.g., no knowledge sink is configured).

**Lifecycle**: Created before track launch or triage. Consumed by the coordinator for track splitting and by implementers and reviewers as factual context. Retired at workflow completion.

**Skip condition**: Discovery is skipped when the task is already narrow and fully scoped — one file, one well-defined bug fix, one known test failure, or one already-triaged review comment. When skipped, record the `Skip reason` field.

## Workflow outcome measures

Use at the end of any workflow skill to record aggregate effectiveness signals. Each skill should record the fields that are meaningful for its workflow stage, using the names below. Populate the applicable fields once, at workflow completion, in the batch summary or final report.

```text
discovery-reuse: yes | no | skipped
prior-learnings: <integer count of matching knowledge artifacts> | none-found | skipped
rescue-attempts: <integer — total rescue attempts across all tracks, or 0>
abandonment-events: <integer — tracks or items abandoned without resolution, or 0>
re-review-loops:
  <track-or-item>: <integer — extra review rounds beyond the first, or 0>
final-gate-result: ready | ready-with-follow-ups | not-ready | stopped
```

**Field definitions**

| Field | Type | Description |
|-------|------|-------------|
| `discovery-reuse` | `yes \| no \| skipped` | Whether the discovery brief was reused by downstream tracks or reviewers. `skipped` if discovery was not performed. |
| `prior-learnings` | integer \| `none-found` \| `skipped` | Count of knowledge artifacts whose applicability matched the workflow scope. `none-found` when the lookup ran but returned no matches. `skipped` when no knowledge sink was discoverable or the workflow does not support prior-learning lookup. |
| `rescue-attempts` | integer | Total number of rescue attempts across all tracks during the workflow. |
| `abandonment-events` | integer | Number of tracks or review items abandoned without resolution. |
| `re-review-loops` | map of track → count | Per-track count of extra implementer-reviewer revision cycles beyond the initial review. |
| `final-gate-result` | `ready \| ready-with-follow-ups \| not-ready \| stopped` | Normalized token form of the readiness verdict: `ready for review` → `ready`, `ready with follow-ups` → `ready-with-follow-ups`, `not ready` → `not-ready`, `stopped by user` → `stopped`. |

**Recording rules**

- Populate the fields that apply to the active workflow at completion as part of the batch summary or final report.
- If the workflow stops early — due to user interruption, escalation, or a stop condition — record whatever measures are available and append an interruption note explaining which fields are incomplete and why.
- One outcome-measures block per workflow invocation. Do not aggregate across separate workflow runs.

## Knowledge artifact

Use for `knowledge-compound` and any workflow that captures a reusable lesson from a completed task.

```text
Problem: <concise description of the problem that was solved>
Signals: <observable symptoms, error messages, metric anomalies, or behavioral clues that indicated this problem>
Resolution: <what was done to resolve the problem — the approach, not just the outcome>
Guardrails: <conditions under which the resolution is safe to apply, and known edge cases or risks>
Applicability: <when this knowledge applies — technology, context, failure shape, or constraints>
Source references: <links or paths to the originating session, PR, issue, RCA, or commit>
Sink reference: <where this artifact is durably stored — file path, issue URL, wiki page, or other repository-appropriate location>
```

**Sink requirement**: The sink must be durable and repository-appropriate — a committed file, an issue, a wiki page, or another persistent location that survives session end. Chat-only storage does not satisfy this requirement. The specific sink location is a project-level decision; this template does not mandate a global directory taxonomy.

**Lifecycle**: Created at the end of a workflow that produced a reusable lesson. Consumed by future sessions, contributors, or agents encountering the same problem shape. Not retired unless the knowledge is superseded.

## Refresh summary

Use for `knowledge-refresh`.

```text
Refresh scope: <directory, sink, or explicit candidate list>
Candidate count: <integer>
Progression mode: manual | guided | auto
Triggering context: <conductor summary, planning brief, developer request, or review finding>
State file: .workflow-orchestration/state.json
Candidates:
- <artifact path> | <classification: trusted | stale | duplicate | obsolete | superseded | needs-capture> | <maintenance action> | <outcome>
Canonical artifacts:
- <path> — <one-line summary of what it covers>
Retired artifacts:
- <path> — <reason: duplicate of X | obsolete | superseded by Y>
Routed to knowledge-compound:
- <gap description> — <evidence or context provided>, or none
Routed to architecture-review:
- <candidate description> — <reason>, or none
Unresolved questions:
- <question or ambiguity>, or none
Artifact sink: <.workflow-orchestration/artifacts/refresh-summary-<topic>.md or another durable sink>
Next action: <what should happen next>
Summary: <short summary of the refresh outcome>
```

**Lifecycle**: Created at the end of a refresh pass. Consumed by future planning
and review lookups to understand which knowledge artifacts are current and
canonical. The summary is a point-in-time record — a later refresh pass may
produce a new summary that supersedes this one.

## When to use these templates

Use a committed artifact when:

- the workflow output should survive the current session;
- another contributor or agent will need to pick it up later;
- the result is part of the repository's durable design or review history.

Do not commit the artifact when it is only scratch work for a single local session.

## Contracts summary

Use for `contract-generator`.

```text
Feature dir: <.sdd/{feature-dir}/>
Spec input: <path to spec.md or natural-language description>
Generated: <ISO 8601 timestamp>
Output files:
- openapi.yaml: <generated | skipped — reason>
- schema/<EntityName>.json: <list of files generated>
- features/<feature-name>.feature: <list of files generated>
FR-IDs mapped: <count> — <FR-001, FR-002, ...>
FR-IDs unresolved: <count> — <FR-004 (domain rule, no endpoint), ...>
Low-confidence extractions:
- <section name> | <reason> | <output annotation>
Regenerated from prior run: <yes | no>
```
