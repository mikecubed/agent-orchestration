---
name: parallel-implementation-loop
description: Run independent implementation tracks in parallel with disciplined review, merge, and validation gates.
---

## Purpose

Use this skill when a developer wants to implement a reviewed plan or task list with multiple parallel tracks without losing control of testing, integration, or review quality.

This is an execution skill, not a planning skill. Use it only after the feature already has accepted requirements, a plan, or an actionable task list.

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

- the integration branch and final review target;
- the validation commands for each track;
- the repository's testing and quality gates;
- the approved branch, worktree, or sandbox strategy;
- any local rules for opening draft pull requests or track branches.

If any of those inputs are missing, stop and get them first.

## Default Roles

Use separate roles for:

- an implementer model or agent;
- a reviewer model or agent.

Keep implementation and review separate whenever possible.

## Core Rules

### 1. Only parallelize truly independent work

Before launching tracks:

1. read the current tasks and dependency notes;
2. choose only tasks that are ready now;
3. group work by clear ownership boundaries;
4. serialize anything that touches the same tight code region, unstable contract, or unfinished prerequisite.

If in doubt, serialize.

### 2. TDD stays mandatory on every code-bearing track

Each implementation track should:

1. add or update failing tests first when behavior changes;
2. implement only enough to make the tests pass;
3. refactor while the tests remain green.

Do not allow implementation-first drift just because work is parallel.

### 3. Temporary work surfaces are disposable, not permanent state

If the workflow uses worktrees, branches, or other sandboxes:

1. treat the integration branch as the long-lived review surface;
2. treat track work surfaces as temporary and batch-owned;
3. record, for each track:
   - track name;
   - owned task IDs;
   - owned files or modules;
   - validation commands;
   - current state (`active`, `merged`, `abandoned`, `blocked`);
4. do not silently discard dirty track state.

## Workflow

### 1. Establish the implementation baseline

Before launching tracks:

1. read the relevant requirements, plan, tasks, and nearby code;
2. identify the next ready tasks;
3. confirm the integration branch and final review target;
4. define track boundaries explicitly:
   - track name;
   - owned tasks;
   - owned files;
   - dependencies;
   - validation commands;
   - merge target.

### 2. Launch implementation tracks

For each track:

1. create an isolated work surface if the repository uses them;
2. provide the implementer with:
   - exact task IDs;
   - exact files or modules;
   - TDD expectations;
   - reuse constraints;
   - validation commands;
   - instruction to stay within scope;
3. require the track to report:
   - files changed;
   - tests added or updated;
   - validation performed;
   - uncertainties or blockers.

### 3. Review each completed track

After a track finishes:

1. send the diff to a separate reviewer;
2. ask for only substantive issues:
   - correctness bugs;
   - contract drift;
   - missing tests;
   - boundary violations;
   - duplication that materially matters.

Do not spend review budget on style-only nits.

### 4. Revise if needed

If the reviewer finds real issues:

1. send the issues back to the implementer;
2. rerun targeted validation;
3. re-review only if the changes were substantial.

Stop when the reviewer no longer finds meaningful issues.

### 5. Integrate tracks carefully

When tracks are ready:

1. merge them into the integration branch one at a time;
2. resolve cross-track conflicts explicitly;
3. run targeted integration validation after risky merges;
4. stop and reconcile immediately if two tracks drifted on a shared interface.

### 6. Final validation and cleanup

After all track work is integrated:

1. verify the integrated behavior is coherent;
2. run the repository's real quality gates;
3. run the final PR-readiness workflow on the stable integrated diff;
4. retire clean temporary work surfaces;
5. keep any retained work surface only with an explicit reason.

## Required Gates

### Track gate

A track is not complete until:

- tests were added or updated first when applicable;
- track-local validation passes;
- changed files stayed within scope;
- review found no unresolved substantive issues.

### Batch gate

The batch is not complete until:

- all integrated work is coherent;
- repository quality gates pass;
- the final readiness workflow has run on the stable integrated diff;
- temporary work surfaces are cleaned up or explicitly retained.

## Stop Conditions

- review or fix churn continues without convergence;
- track boundaries prove false;
- required repository inputs are still unknown;
- the developer asks to stop.

When that happens, reduce concurrency and continue serially.
