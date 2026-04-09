---
name: pr-publish-orchestration
description: Bridge ready-to-merge work into commit, push, and PR publication, deflecting versioning and release concerns to release-orchestration.
---

## Purpose

Use this skill to publish ready work — commit, push, and create or update a pull request — after upstream readiness has been confirmed. This is a thin publication bridge, not a review or release skill.

The skill stops at PR creation or update. It explicitly deflects:

- **Versioning, changelog, tagging, and release creation** → `/workflow-orchestration:release-orchestration`
- **Non-ready work** → `/workflow-orchestration:final-pr-readiness-gate` or the upstream `/workflow-orchestration:pr-review-resolution-loop` path

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "publish this branch"
- "commit and push my changes"
- "open a PR for this work"
- "update the existing PR"
- "ship this to review"

Do **not** activate when:

- the work has not passed a readiness gate — deflect to `/workflow-orchestration:final-pr-readiness-gate`;
- the request is about releasing, tagging, or versioning — deflect to `/workflow-orchestration:release-orchestration`;
- existing review comments are unresolved — deflect to `/workflow-orchestration:pr-review-resolution-loop`.

## Project-Specific Inputs

Before you start, identify:

- **Branch name** — the source branch to publish.
- **Target branch** — the base branch for the PR (usually `main`; confirm with the developer if ambiguous).
- **Commit message or strategy** — conventional commit message, squash preference, or message template. If none is provided, derive from the branch context.
- **PR title and body** — explicit values or auto-derive from the commit log and branch description.
- **Readiness evidence** — a prior readiness verdict from `/workflow-orchestration:final-pr-readiness-gate` or `/workflow-orchestration:diff-review-orchestration`, or CI status confirming the branch is ready.
- **Existing PR number** — if updating an existing PR rather than creating a new one.

Gather factual context: confirm branch state, uncommitted changes, remote tracking status, and whether a PR already exists for the branch before proceeding.

## Readiness Prerequisite

This skill requires evidence that the work is ready to publish. Acceptable evidence includes:

1. A `ready` or `ready-with-follow-ups` verdict from `/workflow-orchestration:final-pr-readiness-gate` in the current session.
2. A passing readiness report from `/workflow-orchestration:diff-review-orchestration`.
3. All CI checks passing on the branch with no unresolved review comments.
4. Explicit developer override — the developer states the work is ready and accepts responsibility.

If none of these conditions are met, **deflect** — do not publish. See § Deflection Rules.

## Workflow

### 1. Validate publish preconditions

Before any publication action:

1. Confirm the source branch exists and has commits ahead of the target branch.
2. Check for uncommitted changes — if present, ask the developer whether to stage and commit them or abort.
3. Verify readiness evidence (see § Readiness Prerequisite).
4. Check whether a PR already exists for this branch against the target — this determines create vs. update path.

### 2. Commit (if needed)

If there are staged or unstaged changes that the developer wants included:

1. Stage the relevant changes.
2. Commit with the agreed message or a conventional-commit-formatted message derived from context.
3. Do **not** amend or rebase unless the developer explicitly requests it.

### 3. Push

1. Push the branch to the remote.
2. If the branch has no upstream tracking ref, set it (`--set-upstream`).
3. If the push is rejected (e.g., diverged history), surface the conflict and ask the developer how to proceed — do not force-push without explicit approval.

### 4. Create or update the pull request

**Create path** — when no PR exists for this branch:

1. Create a PR against the target branch using `gh pr create` or the platform API.
2. Set title and body from the agreed inputs or auto-derived content.
3. Apply labels, reviewers, or draft status if the developer specified them.

**Update path** — when a PR already exists:

1. Confirm the push updated the PR's head.
2. Update PR title, body, labels, or reviewers only if the developer requested changes.
3. If the PR was in draft, ask whether to mark it ready for review.

### 5. Produce a durable publish summary

Emit a publish summary artifact recording:

- **Branch** — source and target branches.
- **Commits published** — list of commits pushed (short SHA + subject).
- **PR action** — created (with PR number and URL) or updated (with PR number).
- **Readiness evidence** — what satisfied the readiness prerequisite.
- **Skipped steps** — any steps skipped with reasons (e.g., "commit skipped: working tree clean").
- **Deflected concerns** — items explicitly out of scope for this invocation:
  - Versioning → `/workflow-orchestration:release-orchestration`
  - Changelog → `/workflow-orchestration:release-orchestration`
  - Tagging → `/workflow-orchestration:release-orchestration`
  - Release creation → `/workflow-orchestration:release-orchestration`

The summary must make the next action obvious: either the PR is ready for human review, or a follow-up skill invocation is needed.

## Deflection Rules

This skill deflects rather than attempting work outside its scope:

| Condition | Deflection target | Action |
|---|---|---|
| Work is not ready (no readiness evidence) | `/workflow-orchestration:final-pr-readiness-gate` | Stop and recommend running the readiness gate first. |
| Unresolved review comments on existing PR | `/workflow-orchestration:pr-review-resolution-loop` | Stop and recommend resolving comments before publishing updates. |
| Developer requests versioning or changelog | `/workflow-orchestration:release-orchestration` | Acknowledge the request, note it in the publish summary, and recommend invoking release-orchestration after the PR merges. |
| Developer requests tagging or release creation | `/workflow-orchestration:release-orchestration` | Same as above — deflect with a clear handoff note. |
| Request is about planning or specification | `/workflow-orchestration:planning-orchestration` | Redirect without performing publication. |

When deflecting, always explain why and name the specific skill to invoke next.

## Required Gates

A publication pass is not complete until:

- readiness evidence was verified or the developer explicitly overrode the check;
- all intended commits were pushed to the remote;
- a PR was created or confirmed updated;
- a durable publish summary artifact was produced recording branch state, actions taken, and deflected concerns.

### Verification checklist

Before declaring publication complete, confirm ALL of the following:

- [ ] Readiness evidence verified or developer override recorded — PASS / FAIL
- [ ] Branch pushed to remote with all intended commits — PASS / FAIL
- [ ] PR created or updated successfully — PASS / FAIL
- [ ] Publish summary artifact produced — PASS / FAIL
- [ ] No release-scoped actions performed (versioning, changelog, tagging, release) — PASS / FAIL

If any item is FAIL: surface the failing item, state what must be done to resolve it, and do not declare publication complete.

## Stop Conditions

- Readiness evidence is missing and the developer declines to override — deflect to `/workflow-orchestration:final-pr-readiness-gate`.
- Push fails due to diverged history and the developer declines to resolve — stop and preserve the publish summary with the failure recorded.
- PR creation or update fails (permissions, API errors) — stop, record the error, and surface the partial publish summary.
- The developer asks to stop.
- Rescue: on any unrecoverable mid-workflow failure, emit a partial publish summary recording completed steps, the failure point, and skipped steps before halting.

## Example

### Create a new PR after readiness

```text
Developer: /workflow-orchestration:pr-publish-orchestration publish this branch

Coordinator:
  Branch: feat/add-pagination → main
  Uncommitted changes: none
  Readiness evidence: final-pr-readiness-gate verdict "ready" from this session
  Existing PR: none

  → Pushing feat/add-pagination to origin...
    Push successful (3 commits ahead of main).

  → Creating PR...
    PR #142 created: "feat: add pagination to /users endpoint"
    URL: https://github.com/org/repo/pull/142

  --- Publish Summary ---
  Branch: feat/add-pagination → main
  Commits published: a1b2c3d feat: add pagination, d4e5f6a fix: edge case, 7g8h9i0 test: pagination coverage
  PR action: created #142
  Readiness evidence: final-pr-readiness-gate verdict "ready"
  Skipped steps: commit (working tree clean)
  Deflected concerns:
    - Versioning → /workflow-orchestration:release-orchestration
    - Changelog → /workflow-orchestration:release-orchestration
    - Tagging → /workflow-orchestration:release-orchestration
    - Release creation → /workflow-orchestration:release-orchestration
  Next action: PR #142 is ready for human review.
```

### Update an existing PR

```text
Developer: /workflow-orchestration:pr-publish-orchestration push and update the PR

Coordinator:
  Branch: fix/null-check → main
  Uncommitted changes: 2 files staged
  Readiness evidence: all CI checks passing, no unresolved comments
  Existing PR: #98

  → Committing staged changes...
    Committed: "fix: add null guard in createWidget"

  → Pushing fix/null-check to origin...
    Push successful (1 new commit).

  → PR #98 updated with new head commit.
    PR is in draft — would you like to mark it ready for review?

Developer: yes

  → Marked PR #98 as ready for review.

  --- Publish Summary ---
  Branch: fix/null-check → main
  Commits published: b2c3d4e fix: add null guard in createWidget
  PR action: updated #98, marked ready for review
  Readiness evidence: CI passing, no unresolved comments
  Skipped steps: none
  Deflected concerns:
    - Versioning → /workflow-orchestration:release-orchestration
    - Changelog → /workflow-orchestration:release-orchestration
  Next action: PR #98 is ready for human review.
```

### Non-ready deflection

```text
Developer: /workflow-orchestration:pr-publish-orchestration publish this branch

Coordinator:
  Branch: feat/new-api → main
  Readiness evidence: none found
    — No readiness verdict in this session.
    — CI status: 1 check failing.
    — Unresolved review comments: 3.

  ⛔ Cannot publish: readiness prerequisite not met.

  Recommended next steps:
  1. Resolve review comments → /workflow-orchestration:pr-review-resolution-loop
  2. Fix failing CI check.
  3. Run readiness gate → /workflow-orchestration:final-pr-readiness-gate
  4. Then re-invoke → /workflow-orchestration:pr-publish-orchestration
```

### Release-shaped deflection

```text
Developer: /workflow-orchestration:pr-publish-orchestration publish and tag a release

Coordinator:
  Publication scope: commit, push, and PR creation only.
  Tagging and release creation are outside this skill's scope.

  → I can publish your branch and create/update the PR.
  → For tagging and release creation, invoke:
    /workflow-orchestration:release-orchestration

  Would you like me to proceed with just the publication steps?
```
