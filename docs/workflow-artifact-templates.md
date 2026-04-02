# Workflow Artifact Templates

Use this document when you want a durable artifact for one of the shared workflow loops in this repository. These templates are intentionally repo-level and generic: they define the field shape for workflow outputs that would otherwise live only in chat, even when the final durable sink is not a committed Markdown file.

## Where to store artifacts

For committed, durable workflow artifacts in this repository:

- store them under `docs/`;
- prefer descriptive names over ad hoc notes;
- keep one file per coherent output.

Suggested names:

- `docs/track-report-<topic>.md`
- `docs/review-resolution-<topic>.md`
- `docs/readiness-report-<topic>.md`

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
Open questions: <questions requiring developer input, or none>
Skip reason: <if discovery was skipped, why — e.g., "single file, fully scoped bug fix">
```

**Lifecycle**: Created before track launch or triage. Consumed by the coordinator for track splitting and by implementers and reviewers as factual context. Retired at workflow completion.

**Skip condition**: Discovery is skipped when the task is already narrow and fully scoped — one file, one well-defined bug fix, one known test failure, or one already-triaged review comment. When skipped, record the `Skip reason` field.

## Workflow outcome measures

Use at the end of any workflow skill to record aggregate effectiveness signals. Each skill should record the fields that are meaningful for its workflow stage, using the names below. Populate the applicable fields once, at workflow completion, in the batch summary or final report.

```text
discovery-reuse: yes | no | skipped
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
| `rescue-attempts` | integer | Total number of rescue attempts across all tracks during the workflow. |
| `abandonment-events` | integer | Number of tracks or review items abandoned without resolution. |
| `re-review-loops` | map of track → count | Per-track count of extra implementer-reviewer revision cycles beyond the initial review. |
| `final-gate-result` | `ready \| ready-with-follow-ups \| not-ready \| stopped` | Normalized token form of the readiness verdict: `ready for review` → `ready`, `ready with follow-ups` → `ready-with-follow-ups`, `not ready` → `not-ready`, `stopped by user` → `stopped`. |

**Recording rules**

- Populate the fields that apply to the active workflow at completion as part of the batch summary or final report.
- If the workflow stops early — due to user interruption, escalation, or a stop condition — record whatever measures are available and append an interruption note explaining which fields are incomplete and why.
- One outcome-measures block per workflow invocation. Do not aggregate across separate workflow runs.

## When to use these templates

Use a committed artifact when:

- the workflow output should survive the current session;
- another contributor or agent will need to pick it up later;
- the result is part of the repository's durable design or review history.

Do not commit the artifact when it is only scratch work for a single local session.
