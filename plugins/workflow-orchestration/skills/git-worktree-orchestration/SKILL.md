---
name: git-worktree-orchestration
description: Manage git worktree lifecycle for parallel track execution, reducing friction for workflow-orchestration:parallel-implementation-loop.
---

## Purpose

Use this skill to create, validate, and clean up git worktrees on behalf of `/workflow-orchestration:parallel-implementation-loop` or any other workflow that needs isolated working directories for parallel tracks.

This skill owns worktree lifecycle only — creation, precondition checks, conflict detection, and cleanup. It does not own implementation logic, review, or merge decisions. Those responsibilities belong to the calling workflow. It must not modify the caller's current working tree.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer or a calling workflow asks for things like:

- "set up worktrees for these parallel tracks"
- "create isolated work surfaces for implementation"
- "clean up worktrees after the batch is done"
- "check whether worktrees can be created for these tracks"

Also activate when:

- `/workflow-orchestration:parallel-implementation-loop` needs to provision work surfaces before launching tracks;
- a batch of independent tasks requires isolated directories to avoid cross-track interference;
- worktree cleanup is needed after tracks have been merged or abandoned.

## Project-Specific Inputs

Before you start, identify:

- **track names** — the list of track identifiers that need worktrees (e.g., `api-validation`, `auth-refactor`);
- **base branch** — the branch from which each worktree branch is created (e.g., `main`, `feat/my-feature`);
- **worktree path convention** — the directory pattern for worktree roots (default: `../{repo}-wt-{track}`);
- **branch naming convention** — the pattern for worktree branches (default: `wt/{track}`);
- **environment preconditions** — the repository must satisfy all of these:
  - is a git repository (`.git` exists or `git rev-parse --is-inside-work-tree` succeeds);
  - is not a shallow clone (`git rev-parse --is-shallow-repository` returns `false`);
  - is not a bare repository (`git rev-parse --is-bare-repository` returns `false`);
  - is not itself a nested worktree (the current directory is the main worktree, not an already-linked worktree being used as a parent).

If any of those inputs are missing, stop and get them from the developer or caller first.

## Workflow

### 1. Validate preconditions

Before creating any worktrees, verify every environment precondition:

1. confirm the current directory is a git repository;
2. confirm it is not a shallow clone;
3. confirm it is not a bare repository;
4. confirm it is not a nested worktree (the working directory is the main worktree);
5. confirm the base branch exists and is reachable;
6. confirm the requested worktree paths do not collide with existing directories or existing worktrees;
7. confirm there is no path collision between any two requested tracks.

If any precondition check fails, stop immediately and report the failure. Because creation has not started yet at this stage, there should be no partial worktrees to clean up.

Produce a factual context brief summarizing the precondition results so the caller can inspect them:

```text
Precondition check: git repo — PASS / FAIL
Precondition check: not shallow — PASS / FAIL
Precondition check: not bare — PASS / FAIL
Precondition check: not nested worktree — PASS / FAIL
Base branch: <branch> — exists / missing
Path collisions: none / <list of collisions>
```

### 2. Create worktrees and branches

For each track:

1. compute the worktree path using the path convention;
2. compute the branch name using the branch naming convention;
3. run `git worktree add -b <branch> <path> <base-branch>`;
4. verify the worktree was created and the branch exists;
5. record the mapping of track name → worktree path → branch name.

Create worktrees sequentially, not in parallel. If a creation step fails, attempt rescue by diagnosing the error (e.g., branch already exists, path already in use) and reporting the specific failure. If the failure still cannot be resolved, stop before creating any additional worktrees, record the mappings already created in this run, and either clean them up or explicitly hand them off with documentation.

### 3. Detect conflicts

After all worktrees are created:

1. list all active worktrees with `git worktree list`;
2. confirm each requested worktree appears in the list;
3. confirm no two tracks share the same worktree path or branch;
4. confirm each worktree's HEAD points to the expected base branch commit.

Report any discrepancies to the caller as a durable artifact or summary before proceeding.

### 4. Return worktree manifest

Return a structured manifest to the caller with all track-to-worktree mappings:

```text
Worktree manifest:
  Track: <track-name>
  Path: <worktree-path>
  Branch: <branch-name>
  Base: <base-branch>
  Status: ready
```

The caller uses this manifest to dispatch implementers to the correct work surfaces.

### 5. Cleanup operation

When the caller signals that tracks are complete (merged, abandoned, or retained):

1. for each worktree marked for removal:
   - confirm the worktree has no uncommitted changes; if dirty, warn the caller and skip unless force-cleanup is requested;
   - run `git worktree remove <path>`;
   - optionally delete the tracking branch with `git branch -d <branch>` if it has been merged;
2. run `git worktree prune` to clean up stale worktree references;
3. verify the cleanup by listing remaining worktrees.

Do not force-remove dirty worktrees without explicit caller approval. Partial work must be preserved or explicitly acknowledged as lost.

## Required Gates

### Precondition gate

All environment preconditions must pass before any worktree is created. A single failure blocks the entire operation.

### Creation gate

Every requested worktree must exist and be verified before returning the manifest to the caller. Partial creation without explicit caller acknowledgment is not allowed.

### Cleanup gate

After cleanup:

- removed worktrees must no longer appear in `git worktree list`;
- pruned references must be clean;
- any dirty worktrees that were skipped must be reported.

A durable report of the cleanup outcome must be produced so downstream workflows have a record of what was removed and what was retained.

### Verification checklist — worktree operation complete

Before declaring the operation complete, confirm ALL of the following. Any failing item blocks the completion declaration.

- [ ] All environment preconditions passed — PASS / FAIL
- [ ] All requested worktrees were created and verified — PASS / FAIL
- [ ] No path or branch collisions detected — PASS / FAIL
- [ ] Worktree manifest returned to caller — PASS / FAIL
- [ ] Cleanup removed all requested worktrees (or dirty skips reported) — PASS / FAIL (if cleanup was requested)

If any item is FAIL: report the failing item(s) by name, state what must be done to resolve each, and do not advance past the gate.

## Stop Conditions

- The current directory is not a git repository.
- The repository is a shallow clone.
- The repository is a bare repository.
- The current directory is a nested worktree (already a linked worktree, not the main worktree).
- A requested worktree path collides with an existing directory or worktree.
- The base branch does not exist or is not reachable.
- Worktree creation fails after a rescue attempt (e.g., branch name conflict that cannot be resolved).
- The developer or calling workflow asks to stop.

When stopping after creation has started, record partial results — any worktrees that were successfully created, any that failed, and the reason for stopping. Clean up any worktrees or branches created by the failed attempt unless the developer explicitly wants to keep them, and never leave retained worktrees undocumented.

## Example

### Setting up worktrees for two parallel tracks

The developer wants to implement two independent tracks from a plan. The calling workflow invokes this skill to provision work surfaces.

```text
Developer: set up worktrees for tracks api-validation and auth-refactor on base branch feat/user-auth

Skill invocation: /workflow-orchestration:git-worktree-orchestration
```

**Step 1 — Validate preconditions**

```text
Precondition check: git repo — PASS
Precondition check: not shallow — PASS
Precondition check: not bare — PASS
Precondition check: not nested worktree — PASS
Base branch: feat/user-auth — exists
Path collisions: none
```

**Step 2 — Create worktrees**

```bash
git worktree add -b wt/api-validation ../my-app-wt-api-validation feat/user-auth
git worktree add -b wt/auth-refactor ../my-app-wt-auth-refactor feat/user-auth
```

**Step 3 — Return manifest to caller**

```text
Worktree manifest:
  Track: api-validation
  Path: ../my-app-wt-api-validation
  Branch: wt/api-validation
  Base: feat/user-auth
  Status: ready

  Track: auth-refactor
  Path: ../my-app-wt-auth-refactor
  Branch: wt/auth-refactor
  Base: feat/user-auth
  Status: ready
```

The caller (`/workflow-orchestration:parallel-implementation-loop`) now dispatches implementers to each worktree path.

**Step 4 — Cleanup after tracks are merged**

```bash
git worktree remove ../my-app-wt-api-validation
git worktree remove ../my-app-wt-auth-refactor
git branch -d wt/api-validation
git branch -d wt/auth-refactor
git worktree prune
```

```text
Cleanup report:
  Removed: api-validation (worktree + branch)
  Removed: auth-refactor (worktree + branch)
  Remaining worktrees: 1 (main working tree only)
  Stale references pruned: 0
```
