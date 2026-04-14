---
name: parallel-implementation-loop
description: Run independent implementation tracks in parallel with disciplined review, merge, validation, and publication gates.
---

## Purpose

Use this skill when a developer wants to implement a reviewed plan or task list with multiple parallel tracks without losing control of testing, integration, or review quality.

This is an execution skill, not a planning skill. Use it only after the feature already has accepted requirements, a plan, or an actionable task list.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "implement these tasks in parallel"
- "split this work into separate tracks"
- "have one model implement and another review each track"
- "parallelize the next ready tasks"

Also activate when:

- there are multiple dependency-ready tasks;
- the tasks touch different files or modules;
- the repository already has a documented validation path for the affected area.

## Project-Specific Inputs

Before you start, identify:

- the integration feature branch and final review target;
- the validation commands for each track;
- the repository's testing and quality gates;
- whether `clean-code-codex:conductor` is loaded in the current session for advisory quality checks;
- the worktree path for each parallel track (required when launching any parallel implementer track);
- any local rules for opening draft pull requests or track branches;
- the maximum revision rounds per track before escalation (default: 2).

If any of those inputs are missing, stop and get them first.

## Default Roles

Use separate roles for:

- an **implementer** model or agent;
- a **reviewer** model or agent.

Keep implementation and review separate whenever possible.

In Claude Code, spawn each role as a separate agent using the Agent tool. Pass the implementer a scoped prompt with exact task, file, TDD constraints, and concise quality expectations such as reuse before copy, single-purpose abstractions, and low-complexity control flow. Pass the reviewer only the diff and the review criteria. Keep implementation and review judgment separate. The coordinator may share a factual brief that includes task boundaries, files, validation commands, and known dependencies. Do not share proposed conclusions, review verdicts, or implementation rationale across roles.

### Escalation: Fleet / Agent Team Mode

If the active runtime offers a higher-cost orchestration mode such as a Fleet command or Claude Code agent teams, treat it as an explicit escalation path rather than the default execution mode.

Default to standard per-role agents first. Before escalating, explain why the extra coordination would help and ask the developer whether they want the higher-cost mode.

Escalate only when:

1. there are more than 2 clearly independent ready tracks;
2. each track has enough local context that repeated handoffs would be inefficient;
3. specialized sub-roles would materially improve throughput or review quality;
4. the developer confirms the extra token spend is worth it.

When team mode is approved:

- preserve the same role separation;
- assign one clear owner per track;
- keep reviewer authority independent from implementers;
- fall back to standard agents if coordination overhead becomes noisy or ambiguous.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   These are plain YAML files (no markdown, no fenced blocks). Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is absent, fall back to the baked-in default for that role — do not re-prompt for a key that is missing.

2. **Session cache** — if models were already confirmed earlier in this session, reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use the defaults below silently without prompting. Create project model config only when the developer wants persistent overrides.

#### Config file format

The config files are plain YAML (not markdown). Create the file for the active runtime and set only the keys you want to override — absent keys fall back to the baked-in defaults. The keys for this skill are:

```yaml
implementer: <model-name>
reviewer: <model-name>
scout: <model-name>
```

See `docs/models-config-template.md` in this plugin for ready-to-copy templates for both runtimes.

#### Default models

| Runtime       | Role        | Default model       |
|---------------|-------------|---------------------|
| Copilot CLI   | Implementer | `claude-opus-4.6`   |
| Copilot CLI   | Reviewer    | `gpt-5.4`           |
| Copilot CLI   | Scout       | `claude-haiku-4.5`  |
| Claude Code   | Implementer | `claude-opus-4.6`   |
| Claude Code   | Reviewer    | `claude-opus-4.6`   |
| Claude Code   | Scout       | `claude-haiku-4.5`  |

## Core Rules

### 1. Only parallelize truly independent work

Before launching tracks:

1. read the current tasks and dependency notes;
2. choose only tasks that are ready now;
3. group work by clear ownership boundaries;
4. serialize anything that touches the same tight code region, unstable contract, or unfinished prerequisite.

If in doubt, serialize.

### 2. TDD stays mandatory on every code-bearing track

Each implementation track must:

1. add or update failing tests first when behavior changes;
2. implement only enough to make the tests pass;
3. refactor while the tests remain green.

Do not allow implementation-first drift just because work is parallel.

### 3. Keep code quality explicit, not implied

Each code-bearing track should bias toward:

1. reuse before duplication (**DRY**);
2. small, single-purpose units with clear responsibilities (**SOLID** where it fits);
3. low-complexity control flow and explicit boundaries.

If `clean-code-codex:conductor` is available in the current session, use it as
an advisory quality pass on reviewable track diffs or on the integrated feature
branch before publication.

### 4. Keep concurrency within human review capacity

Default to 2-3 concurrent tracks unless the repository already has strong task isolation,
independent validation paths, and a proven sandbox strategy such as dedicated worktrees.

More concurrency is only worth it when:

1. the track boundaries are obvious;
2. the validation surface for each track is small;
3. the final integrator can still review and merge each track deliberately.

### 5. Temporary work surfaces are disposable, not permanent state

If the workflow uses worktrees, branches, or other sandboxes (in Claude Code, use the Agent tool with `isolation: "worktree"` — it auto-cleans if no changes are made):

1. treat the integration **feature branch** as the long-lived review surface that
   will eventually back the PR;
2. treat track work surfaces as temporary and batch-owned;
3. record, for each track:
   - track name;
   - owned task IDs;
   - owned files or modules;
   - validation commands;
   - track branch name;
   - external worktree path;
   - current state (`active`, `merged`, `abandoned`, `blocked`);
4. do not silently discard dirty track state.

Every implementer track must run in its **own git worktree outside the project
directory**, such as `../{repo}-wt-{track}`. Do not run parallel implementers in
the main project working tree or inside nested directories beneath the project
root; that increases the risk of index and branch-state corruption.

### 6. Continue until the batch is actually complete

Do not stop at "tracks launched", "tests passed", or "ready for review". The
coordinator owns the batch until one of these outcomes is true:

1. all in-scope track work is integrated and validated;
2. the integration feature branch is committed and pushed;
3. a PR has been created or updated for that feature branch;
4. a documented stop condition blocks further progress.

When one track stalls, reduce concurrency, rescue or serialize as needed, and
continue the remaining in-scope work rather than abandoning the whole batch by
default.

## Example Track Definition

Use a compact artifact format before launching each track. For example:

```text
Track: api-validation
Tasks: task-12, task-14
Files: src/api/validators.js, test/api/validators.test.js
Dependencies: task-11 done
Validation: npm test -- test/api/validators.test.js
Track branch: wt/api-validation
Worktree path: ../my-app-wt-api-validation
State: active
```

Persist the same fields in whatever task tracker, scratch file, or branch note the repository uses.

## Workflow

### 1. Establish the implementation baseline

Before launching tracks:

1. read the relevant requirements, plan, tasks, and nearby code;
2. identify the next ready tasks;
3. confirm or create the integration **feature branch** and final review target;
4. define track boundaries explicitly:
   - track name;
   - owned tasks;
   - owned files;
   - dependencies;
   - validation commands;
   - merge target;
   - track branch name;
   - external worktree path.

Default to a dedicated feature branch for the batch. Do not run the workflow on
`main` or another shared long-lived branch unless the developer explicitly asked
for that exceptional path.

### 2. Run discovery (or skip it)

Before delegating to expensive implementers or reviewers, run one lightweight discovery pass using the **scout** model to produce a **discovery brief**. The scout gathers factual context — relevant files, task boundaries, validation commands, dependencies, and open questions — so that downstream roles do not repeat the same exploration.

Run the scout **once per batch or session**, not once per track. Implementers and reviewers inherit only the slice of the brief they need.

Use the discovery brief template from `docs/workflow-artifact-templates.md`:

```text
Task summary: <one-paragraph description of the work>
Task shape: single-track | multi-track-batch | review-resolution-batch | large-diff-readiness
Relevant files: <path>, <path>
Task boundaries: <what is in scope and what is not>
Validation commands: <command>, <command>
Dependencies: <known dependencies or shared interfaces, if multi-track>
Comparison baseline: <branch, commit, or PR reference, if review or readiness>
Open questions: <questions requiring developer input, or none>
Skip reason: <if discovery was skipped, why>
```

**Skip condition**: Skip the scout when the task is already narrow and fully scoped — one file, one well-defined bug fix, one known test failure, or one already-triaged review comment. When skipped, record the skip reason in the brief.

### 3. Pre-flight gate (parallel tracks only)

Before launching any agents, verify:

- invoke `/workflow-orchestration:git-worktree-orchestration` or perform an
  equivalent validated worktree-provisioning step so every track gets an
  isolated work surface before implementation starts;
- every track has a dedicated work surface at a unique path **outside the project directory** — Copilot CLI: `git worktree add ../{repo}-wt-{track} {branch}`; Claude Code: Agent tool with `isolation: "worktree"` and an external worktree path;
- no two tracks share the same working tree.

**Do not launch any agent until all worktrees exist and paths are confirmed.**

### 4. Launch implementation tracks

For each track:

1. choose the execution mode:
   - standard scoped agents by default;
   - Fleet or agent-team mode only for explicitly approved, high-leverage tracks;
2. create or confirm the dedicated external worktree for this track (from the pre-flight gate above);
3. create or update a durable track report using the template shape in `docs/workflow-artifact-templates.md`, initializing the known fields:
    - track name;
    - owned tasks;
    - owned files;
    - dependencies;
    - validation commands;
    - track branch;
    - worktree path;
    - current state;
    - next action.
4. provide the implementer with:
    - exact task IDs;
    - exact files or modules;
    - worktree path to operate in;
    - TDD expectations;
    - concise quality expectations (DRY, SOLID where it fits, low cyclomatic complexity);
    - reuse constraints;
    - validation commands;
    - instruction to stay within scope;
5. require the track to report:
    - files changed;
    - tests added or updated;
    - validation performed;
    - uncertainties or blockers;
    - commit SHA when the track branch reaches a reviewable checkpoint.

Track implementers should commit their scoped work on their track branch when a
track reaches a clean, reviewable state. Do not leave completed track work
uncommitted inside a worktree by default.

### 5. Coordinator progress and rescue policy

After launching tracks, the coordinator monitors each track through a bounded lifecycle of progress checks. This policy prevents silent stalls, preserves partial work, and avoids wasteful duplicate rescue agents.

**Budget transitions**

1. **Soft budget** — the coordinator sets an expected completion window for each track based on task size. The window is advisory only; soft-budget expiry is **not** by itself a rescue trigger.
2. **Progress visible** — a track is considered active when any of these indicators advance between checks:
   - files modified since last check;
   - tests added or updated;
   - validation running or recently completed;
   - partial results returned to the coordinator.
   If at least one indicator has advanced, keep the current track running in the same agent and worktree context.
3. **Stall evidence** — treat a track as stalled only when one or more of these conditions hold:
   - the track reports an explicit blocker or inability to proceed;
   - no meaningful progress is visible across at least 2 coordinator checks;
   - a tool failure, crash, or timeout leaves the current track unable to continue safely;
   - scope expansion makes the original assignment no longer defensible.
4. **Rescue** — when stall evidence exists, the coordinator enters rescue:
   - ask the current track for a brief status, blockers, and the smallest next checkpoint;
   - prefer same-agent continuation in the same worktree and scope first;
   - narrow scope only when the current context proves the original scope cannot finish safely;
   - do **not** spawn a second rescue agent or duplicate the track by default;
   - if same-agent continuation does not restore progress, escalate to the developer or stop the track with partial results rather than launching an inferior duplicate attempt.
5. **Hard budget** — the coordinator defines a maximum total effort per track measured in delegation rounds, not wall time. Reaching hard budget triggers escalation or stop; it does **not** automatically create a rescue agent.
6. **Stopped** — a track enters the stopped state when it reaches hard budget, rescue fails, or the developer cancels it. Stopped tracks record partial results, files touched, tests written, and unresolved items in the batch summary before releasing their work surface.

The coordinator re-evaluates track status after every delegation round. Do not wait for a track to go fully silent before checking, and do **not** treat elapsed time alone as stall evidence.

### 6. Review each completed track

After a track finishes:

1. send the diff to a separate reviewer;
2. ask for only substantive issues:
   - correctness bugs;
   - contract drift;
   - missing tests;
   - boundary violations;
   - duplication that materially matters.

Do not spend review budget on style-only nits.

If `clean-code-codex:conductor` is available, run it as an advisory code-quality
pass on the track diff or the integrated feature branch before publication.

Update the track report after review so it records the current state, validation outcome, unresolved issues, and next action before moving to revision or integration.

### 7. Revise if needed

If the reviewer finds real issues:

1. send the issues back to the implementer as a **targeted resend** containing:
   - unresolved issue IDs from the review;
   - constrained scope limited to the flagged issues;
   - acceptance criteria the resend must satisfy;
   - validation commands to rerun;
   - escalation condition: if the same issue recurs after one bounded resend, escalate to the coordinator for rescue or developer input.
2. rerun targeted validation on the resend result;
3. re-review only if the changes were substantial.

A resend is bounded follow-up work. It is not a restart of the full task and not an invitation to broaden scope. Limit revision to at most two consecutive resend rounds per issue. If an issue survives two rounds, escalate to the developer rather than continuing the loop.

#### Convergence rules

Apply these rules during every revision round to prevent unbounded churn:

1. **Repeated issue** — if a reviewer raises the same substantive issue a second time after a resend has already addressed it, stop the resend loop and apply rescue or re-scope immediately. Do not send the issue back to the implementer a third time. If rescue or re-scope still does not restore convergence, escalate to the developer.
2. **Scope growth** — if a revision introduces changes beyond the original track boundary (new files, new features, or expanded contracts), stop the revision and re-scope the track before continuing. Scope growth during revision is a planning gap, not an implementation task.
3. **Material disagreement** — if the implementer and reviewer disagree on whether a flagged issue is valid and one exchange has not resolved it, escalate to the developer for a decision. Do not let the loop continue without a tiebreaker.
4. **Maximum revision rounds** — a track may complete at most the number of revision rounds specified in Project-Specific Inputs (default: 2). If the track still has unresolved issues after the maximum rounds, escalate to the developer with a summary of what remains and why convergence was not reached.

When a convergence rule fires, record the trigger, the action taken, and the outcome in the track report's rescue history before moving to the next step.

When a resend or rescue occurs, update the track report's state, revision rounds, rescue history, unresolved issues, and next action so the final track gate has a durable record of what changed.

### 8. Integrate tracks carefully

When tracks are ready:

1. merge them into the integration branch one at a time;
2. resolve cross-track conflicts explicitly;
3. run targeted integration validation after risky merges;
4. stop and reconcile immediately if two tracks drifted on a shared interface;
5. commit the integration feature branch as coherent milestones when merges are
   complete or when a stable integrated checkpoint is reached;
6. push the integration feature branch as work is completed rather than leaving
   the publish step implicit.

After merge, update each track report to reflect the final track state (`merged`, `abandoned`, `blocked`, or retained for later work).

### 9. Final validation, publication, and cleanup

After all track work is integrated:

1. verify the integrated behavior is coherent;
2. run the repository's real quality gates;
3. invoke `/workflow-orchestration:final-pr-readiness-gate` on the stable integrated diff;
4. invoke `/workflow-orchestration:pr-publish-orchestration` on the integration
   feature branch to commit (if needed), push, and create or update the PR by
   default;
5. retire clean temporary work surfaces;
6. keep any retained work surface only with an explicit reason.

Only skip PR publication when:

- the developer explicitly requested local-only execution;
- repository policy forbids this workflow from opening or updating PRs;
- a documented stop condition blocks publication even after readiness and rescue.

### 10. Record the batch outcome

Before stopping, publish one durable batch summary that includes:

1. merged tracks;
2. retained or abandoned tracks;
3. validations run;
4. unresolved follow-ups;
5. integration branch status (committed / pushed);
6. PR publication status (created / updated / skipped with reason);
7. workflow outcome measures using the template from `docs/workflow-artifact-templates.md`:
    - `discovery-reuse` — whether the discovery brief was reused by downstream tracks;
    - `rescue-attempts` — total rescue attempts across all tracks;
    - `abandonment-events` — tracks abandoned without resolution;
    - `re-review-loops` — per-track count of extra revision cycles beyond the initial review.

"Durable" means written to a repository-appropriate sink using the template shape from `docs/workflow-artifact-templates.md` — for example, a PR description, a committed document, an issue comment, or a task tracker entry. In this repository, committed workflow artifacts live under `docs/`; other repositories may use a different durable sink. The batch summary MUST be produced; chat-only memory is not sufficient.

## Required Gates

### Track gate

A track is not complete until:

- tests were added or updated first when applicable;
- track-local validation passes;
- changed files stayed within scope;
- review found no unresolved substantive issues;
- completed track work is committed on the track branch or explicitly recorded as
  intentionally uncommitted with reason;
- a durable track report artifact has been updated to reflect the final track state (see `docs/workflow-artifact-templates.md` for the template).

### SESSION.md write — track merged

At this gate (per track, after the track gate passes), write `.agent/SESSION.md`. Record:
- `current-task`: the overall batch task description
- `current-phase`: "track-[N]-merged" (substitute the track number or name)
- `next-action`: the next pending track or "run integration gate" if all tracks are merged
- `workspace`: the integration target branch
- `last-updated`: current ISO-8601 datetime
- `## Decisions`: which tracks are merged, which are pending
- `## Files Touched`: files merged in this track
- `## Open Questions`: any open questions from the track review
- `## Blockers`: active blockers (empty if none)
- `## Failed Hypotheses`: (empty — not applicable for this skill)

If the write fails: log a warning and continue. Do not block track completion.

### Batch gate

The batch is not complete until:

- all integrated work is coherent;
- repository quality gates pass;
- the final readiness workflow has run on the stable integrated diff;
- the integration feature branch is committed and pushed unless local-only
  execution was explicitly requested;
- a PR was created or updated unless repository policy or a documented stop
  condition prevents publication;
- temporary work surfaces are cleaned up or explicitly retained;
- a durable batch summary artifact has been produced that captures merged tracks, retained or abandoned tracks, validations run, and unresolved follow-ups (see `docs/workflow-artifact-templates.md` for the template).

### Verification checklist — batch complete

Before declaring the batch complete, confirm ALL of the following.
Any failing item blocks the "batch complete" declaration.

**Track merge gate (per track)**
- [ ] Track branch is merged to the integration target — PASS / FAIL
- [ ] Track-local validation commands ran and exited 0 — PASS / FAIL
- [ ] Changed files are within the track's declared scope (no out-of-scope files modified) — PASS / FAIL
- [ ] Track work ran in a dedicated external worktree path outside the project directory — PASS / FAIL
- [ ] Completed track work is committed on the track branch (or the exception is recorded) — PASS / FAIL

**Integration gate (whole batch)**
- [ ] Integration validation commands ran on the combined branch and exited 0 — PASS / FAIL
- [ ] No previously-passing tests now fail on the integrated branch — PASS / FAIL
- [ ] Integration feature branch is committed and pushed unless local-only execution was explicitly requested — PASS / FAIL
- [ ] PR created or updated successfully unless repository policy or a documented stop condition prevented publication — PASS / FAIL
- [ ] Durable batch summary artifact has been produced — PASS / FAIL

If any item is FAIL: report the failing item(s) by name, state what must be done to
resolve each, and do not advance past the gate.

## Stop Conditions

- review or fix churn continues without convergence;
- a track exhausts its maximum revision rounds without resolving all issues;
- a repeated issue survives two resend attempts without resolution;
- material implementer-reviewer disagreement cannot be resolved without developer input;
- scope growth during revision indicates a planning gap that must be addressed before continuing;
- track boundaries prove false;
- required repository inputs are still unknown;
- the developer asks to stop;
- a track reaches hard budget after rescue has been attempted.

Before abandoning a stalled track, the coordinator must attempt at least one rescue pass: narrow scope, request a status update, and offer one bounded retry. Only abandon the track if rescue fails or the developer explicitly cancels. When stopping, record partial results, unresolved items, and the reason for stopping. Then reduce concurrency and continue serially with the remaining work.
