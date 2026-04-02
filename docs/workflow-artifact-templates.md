# Workflow Artifact Templates

Use this document when you want a durable artifact for one of the shared workflow loops in this repository. These templates are intentionally repo-level and generic: they give contributors a standard place and shape for workflow outputs that would otherwise live only in chat.

## Where to store artifacts

For committed, durable workflow artifacts in this repository:

- store them under `docs/`;
- prefer descriptive names over ad hoc notes;
- keep one file per coherent output.

Suggested names:

- `docs/track-report-<topic>.md`
- `docs/review-resolution-<topic>.md`
- `docs/readiness-report-<topic>.md`

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
State: active | merged | abandoned | blocked
Summary: <short summary of what changed>
Follow-ups: <remaining risks or next steps>
```

## Review-resolution summary

Use for `pr-review-resolution-loop`.

```text
Review surface: <branch or PR> against <target>
Reviewer source: <GitHub review / Azure DevOps PR review / comments / local review>
Decisions:
- <comment-id> | <correctness / security / test / contract / architecture / stale> | <fixed / declined / clarify first> | <short rationale>
Validation:
- <command>
Result:
- <pass / fail / partial>
Remaining concerns:
- <open blocker or intentional follow-up, or none>
```

## Final readiness report

Use for `final-pr-readiness-gate`.

```text
Review surface: <branch or PR> against <target>
Structured checker: <tool or none>
Blockers:
- <blocker, or none>
Fix-now:
- <fix-now item, or none>
Follow-ups:
- <follow-up item, or none>
Skipped checks:
- <reason, or none>
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

## When to use these templates

Use a committed artifact when:

- the workflow output should survive the current session;
- another contributor or agent will need to pick it up later;
- the result is part of the repository's durable design or review history.

Do not commit the artifact when it is only scratch work for a single local session.
