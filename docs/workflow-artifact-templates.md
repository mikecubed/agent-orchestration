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
Reviewer source: <GitHub review / comments / local review>
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

## When to use these templates

Use a committed artifact when:

- the workflow output should survive the current session;
- another contributor or agent will need to pick it up later;
- the result is part of the repository's durable design or review history.

Do not commit the artifact when it is only scratch work for a single local session.
