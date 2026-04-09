---
name: diff-review-orchestration
description: Coordinate a structured diff review by routing to codex checks, readiness assessment, and review-resolution skills.
---

## Purpose

Use this skill to run a structured, coordinator-shaped diff review that delegates to existing specialist skills rather than re-implementing their logic. It routes work to:

- `clean-code-codex:conductor` — for automated code-quality checks on the diff;
- `workflow-orchestration:final-pr-readiness-gate` — for a final readiness assessment;
- `workflow-orchestration:pr-review-resolution-loop` — for triaging and resolving existing review comments.

The coordinator gathers factual context about the diff, decides which downstream skills apply, invokes them in sequence, and produces a unified review report.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "review this diff"
- "run a full code review on my branch"
- "check this PR for issues"
- "give me a diff review report"

This skill supports three modes:

- **Interactive mode** (default) — the coordinator pauses at decision points, surfaces findings incrementally, and allows the developer to guide triage and fixes in real time. Suitable when a developer is present and wants to steer the review.
- **Report-only mode** — the coordinator runs all checks end-to-end without pausing, collects all findings, and produces a single consolidated review report at the end. The report may recommend handoff to downstream skills (such as `workflow-orchestration:pr-review-resolution-loop`) for follow-up action. Use this mode when the developer wants a hands-off review pass but will act on the results afterward.
- **Headless mode** — the coordinator runs all checks end-to-end deterministically, produces a self-contained review artifact, and exits. Unlike report-only mode, headless output does not recommend or route to downstream interactive skills within the same invocation — the artifact is designed for programmatic consumers (CI pipelines, scheduled checks, dashboards) that interpret findings without further skill invocations. Use this mode for fully automated review gates where no developer interaction is expected during or immediately after the run.

## Project-Specific Inputs

Before you start, identify:

- **Diff target** — the branch, PR number, or commit range to review (e.g., `HEAD~3..HEAD`, `PR #42`, `feat/widget`).
- **Mode flag** — `interactive` (default), `report-only`, or `headless`. If unspecified, default to interactive.
- **`--base` override** — the comparison baseline branch or commit. Defaults to the repository's default branch (usually `main`) if not provided.
- **Codex availability** — whether `clean-code-codex:conductor` is loaded and available in the current session. Check for the plugin at startup; if unavailable, the coordinator degrades gracefully (see § Codex unavailable fallback).

If the diff target or comparison baseline cannot be determined, ask the developer before proceeding.

## Workflow

### 1. Validate the diff surface

Before delegating to any downstream skill:

1. Resolve the diff target and `--base` to concrete git refs.
2. Run an empty-diff check — if the diff is empty (no changed files), stop immediately with a clear message and skip all downstream work.
3. Catalog the changed files: classify each as code, test, config, docs, or binary.
4. **Skip binary files** — exclude binary files from all downstream checks and note them in the review report as skipped with a brief explanation.
5. **Large merge-commit diffs** — if the diff contains more than roughly 80 changed files or spans multiple unrelated topics (heuristic: files spread across more than 5 top-level directories with no common intent), warn the developer and suggest splitting the review into smaller, focused passes before proceeding.

### 2. Gather factual context

Produce a discovery brief per `docs/workflow-artifact-templates.md` containing at minimum:

- task summary describing the review scope;
- relevant files from the diff;
- comparison baseline;
- validation commands for the repository.

Reuse any factual brief or factual context already present in the current session rather than rediscovering. If prior context exists, note that discovery was reused.

### 3. Look up prior learnings

After the discovery brief is ready, search for knowledge artifacts whose applicability overlaps with the reviewed scope — file paths, directories, or technology areas touched by the diff. Use the knowledge artifact template fields (Problem, Signals, Resolution, Guardrails, Applicability) defined in `docs/workflow-artifact-templates.md` to identify relevant matches.

Matching rules:

- Scan repository-local knowledge sinks (e.g., a `docs/knowledge/` directory, issue labels, or another project-configured location). The specific sink location is a project-level decision; if no knowledge sink is discoverable, skip this step and record `prior-learnings: skipped` in the outcome measures and `Prior-learnings consulted: skipped` in the discovery brief.
- Match by file path overlap (any changed file or its parent directory appears in a knowledge artifact's source references or applicability) or by technology/topic overlap (the artifact's applicability mentions a framework, library, or pattern present in the diff).
- Keep the lookup read-only — do not create, modify, or retire knowledge artifacts during a diff review.

If one or more prior learnings match:

- In **interactive mode**, surface the matching knowledge artifacts as advisory context before proceeding to downstream checks. Present each artifact's Problem and Resolution fields as a short summary. The developer may acknowledge, dismiss, or ask for details, but the learnings do not alter which checks run or how findings are triaged.
- In **report-only mode**, collect the matching artifacts for inclusion in the durable report (see § Produce mode-specific output). Do not pause.
- In **headless mode**, collect the matching artifacts for inclusion in the self-contained review artifact. Do not pause or surface interactively.

If no prior learnings match, record `prior-learnings: none-found` in the outcome measures and `Prior-learnings consulted: none-found` in the discovery brief, then continue. The lookup is advisory — it never blocks downstream steps or changes readiness-gate semantics.

### 4. Check for existing review comments

If the diff target is a pull request with existing review comments:

1. Surface the unresolved comment count to the developer.
2. In interactive mode, ask whether to resolve existing comments first via `workflow-orchestration:pr-review-resolution-loop` before running new checks.
3. In report-only mode, record the unresolved comment count and recommend handoff to `workflow-orchestration:pr-review-resolution-loop` in the final report. Do not auto-run the resolution loop — report-only mode must remain non-mutating.
4. In headless mode, record the unresolved comment count in the review artifact. Do not recommend or route to the resolution loop within this invocation — headless output is self-contained and does not assume a follow-up skill invocation.

If there are no existing comments, skip this step.

### 5. Run codex checks

If `clean-code-codex:conductor` is available:

1. Scope the conductor to the relevant files in the diff: include code-bearing files and IaC-style config that the conductor can review (for example Terraform, Kubernetes manifests, or CloudFormation); exclude docs-only files and non-IaC config-only files from code-focused checks.
2. Run the conductor in report-only mode — collect findings without automatically changing files.
3. Collect and classify findings by severity.

#### Codex unavailable fallback

If `clean-code-codex:conductor` is not loaded or not available in the current session:

- Do not fail the entire review.
- Degrade gracefully: skip the codex checks, record the skipped checks in the review report with a note explaining that the codex plugin was unavailable, and continue with the readiness assessment.
- In interactive mode, inform the developer that codex checks were skipped and suggest loading the plugin for future reviews.

#### Rescue policy for codex delays

When the codex conductor stalls, times out, or the diff is large enough to cause processing delays, apply a rescue-before-abandon sequence:

1. **Narrow scope** — reduce to the highest-risk files using the discovery brief.
2. **Drop non-critical checks** — skip stylistic or low-severity rules.
3. **Serialize** — run remaining checks sequentially rather than concurrently.
4. **Re-evaluate** — if the reduced scope completes, proceed normally. If rescue also stalls, record the failure and continue to the readiness assessment with a note about skipped checks.

### 6. Run readiness assessment

Delegate to `workflow-orchestration:final-pr-readiness-gate` with:

- the diff surface and comparison baseline;
- any codex findings from the previous step (or a note that codex was skipped);
- the factual context brief.

When codex findings were already gathered in step 5, pass them as prior structured-check context for the readiness gate to consider alongside the rest of the review inputs. Treat those findings as supporting evidence for the gate's whole-diff readiness judgment (merge-blocking issues, coverage gaps, outstanding review threads), without assuming any specific internal reuse or skip behavior beyond what that skill defines.

The readiness gate produces its own verdict. Do not duplicate its logic — consume and relay its output.

### 7. Produce mode-specific output

#### Interactive mode

1. Surface prior learnings (if any) as advisory context before downstream checks begin.
2. Present findings incrementally as each downstream skill completes.
3. Pause after codex findings to let the developer triage before proceeding to readiness.
4. Surface the readiness verdict with actionable next steps.

#### Report-only mode

Produce a single consolidated review report as a durable artifact following the template in `docs/workflow-artifact-templates.md`. The report is developer-facing and may recommend handoff to downstream skills for follow-up. The report must include:

- diff target and comparison baseline;
- file classification summary (code / test / config / docs / binary-skipped);
- prior-learnings summary — matching knowledge artifacts with Problem and Resolution fields, or a note that none were found;
- existing-comment summary (unresolved count and handoff recommendation), if applicable;
- codex findings and their severity classification, or a note that codex was skipped;
- readiness verdict from the final-pr-readiness-gate;
- skipped checks with reasons;
- next action recommendation.

Include workflow outcome measures:

- `discovery-reuse` — `yes`, `no`, or `skipped`;
- `prior-learnings` — integer count of matching knowledge artifacts, or `none-found`, or `skipped`;
- `rescue-attempts` — integer count, or `0`;
- `codex-available` — `yes` or `no`;
- `final-gate-result` — one of `ready`, `ready-with-follow-ups`, `not-ready`, or `stopped`.

Store the durable report as a durable summary artifact so the next actor can make a decision quickly.

#### Headless mode

Produce a self-contained, deterministic review artifact suitable for programmatic consumption. The artifact follows the same structure as the report-only durable report with these differences:

- **No downstream routing** — the artifact does not recommend handoff to `workflow-orchestration:pr-review-resolution-loop` or any other interactive skill. Existing-comment entries record the unresolved count only, without follow-up suggestions.
- **No interactive prompts** — the coordinator never pauses, never asks for developer input, and never waits for confirmation at any step.
- **Machine-consumable outcome** — include all workflow outcome measures plus a top-level `mode: headless` marker so consumers can distinguish the artifact from a report-only output.

The headless artifact must include the same fields as the report-only report:

- diff target and comparison baseline;
- file classification summary;
- prior-learnings summary;
- existing-comment count (without handoff recommendation);
- codex findings and severity classification, or a note that codex was skipped;
- readiness verdict from the final-pr-readiness-gate;
- skipped checks with reasons;
- workflow outcome measures (same set as report-only, plus `mode: headless`).

Store the artifact as a durable summary artifact. The headless artifact is terminal — it does not trigger or suggest further skill invocations.

## Required Gates

A diff review is not complete until:

- the diff surface was validated (non-empty, files classified);
- codex checks were run or explicitly skipped with a recorded reason;
- the readiness assessment was completed via `workflow-orchestration:final-pr-readiness-gate`;
- a durable review report or artifact was produced (report-only or headless mode) or findings were surfaced to the developer (interactive mode);
- workflow outcome measures were recorded.

### Verification checklist

Before declaring the review complete, confirm ALL of the following:

- [ ] Diff surface is non-empty and validated — PASS / FAIL
- [ ] Binary files excluded and noted — PASS / FAIL / N/A
- [ ] Prior-learnings lookup completed or skipped with reason — PASS / FAIL / N/A
- [ ] Existing review comments addressed or noted — PASS / FAIL / N/A
- [ ] Codex checks completed or skipped with documented reason — PASS / FAIL
- [ ] Readiness assessment completed — PASS / FAIL
- [ ] Output delivered in the correct mode (interactive findings, durable report, or headless artifact) — PASS / FAIL

If any item is FAIL: report the failing item(s), state what must be done to resolve each, and do not declare the review complete.

## Stop Conditions

- The diff is empty — no changed files between the target and baseline.
- Required inputs are missing (no diff target, no determinable baseline) and the developer cannot supply them.
- `clean-code-codex:conductor` is unavailable and no fallback is acceptable to the developer — the developer explicitly declines to proceed without codex checks.
- In headless mode, `clean-code-codex:conductor` is unavailable and no developer is present to approve the fallback — record the skipped checks and exit with a partial artifact.
- The diff is too large to review coherently and the developer declines to split it.
- A downstream skill stalls after rescue attempts have been exhausted.
- The developer asks to stop.

When stopping, report why the review could not complete and preserve any partial results as a durable artifact so work is not lost.

## Autofix Evaluation

### Decision: Deferred

Automatic fix application (autofix) — where the coordinator applies code changes derived from codex findings without developer confirmation — is **deferred** in this version of the skill.

### Rationale

- The review contract produces findings and a readiness verdict but does not include a verified safety contract for automated code mutation. Shipping unrestricted autofix would require guardrails that exceed the scope of the current milestone.
- Autofix interacts with the readiness gate verdict: applying fixes between the codex-check step and the readiness-assessment step could invalidate the gate's inputs or produce a verdict based on a diff state that no longer matches the committed code. That interaction is not yet modeled.
- Review-contract stability requires that the coordinator's output semantics remain predictable across modes. Introducing autofix would create a fourth behavioral axis (mutating vs. non-mutating) orthogonal to the existing three modes, increasing the contract surface before the three-mode contract has been validated in production.

### Conditions for Future Inclusion

To ship autofix in a future milestone, the following bounded guardrails must be in place:

1. **Narrow eligibility contract** — only codex findings meeting a defined severity and confidence threshold qualify for automatic application (e.g., deterministic formatting fixes or import-ordering corrections where the suggested change is unambiguous).
2. **Dry-run preview** — a dry-run step that shows proposed fixes without applying them, allowing the developer (or a CI gate) to approve or reject before mutation.
3. **Atomic rollback** — a git-based or tool-based rollback mechanism so autofix changes can be undone without manual intervention.
4. **Explicit opt-in** — autofix must never activate by default in any mode. It requires an explicit flag (e.g., `--autofix`) and must be documented as an additive capability, not a mode change.
5. **Post-fix re-validation** — autofix-applied changes must pass the same readiness gate that would run without autofix, ensuring the fix does not introduce new issues.
6. **Headless safety** — in headless mode, autofix must be additionally gated on a machine-readable approval signal (e.g., a CI environment variable or config flag) since no developer is present to confirm.

Until these conditions are met, the coordinator surfaces findings for manual triage only. This decision applies equally to all three modes.

## Example

### Interactive invocation

```text
Developer: /workflow-orchestration:diff-review-orchestration review this PR

Coordinator:
  Diff target: PR #87 against main
  Changed files: 14 (11 code, 2 tests, 1 binary — logo.png skipped)
  Mode: interactive

  → Looking up prior learnings for reviewed scope...
    1 prior learning found:
    — CI auth seed ordering: async seed must complete before auth fixture queries.
    (advisory — does not change downstream checks)

  → Checking for existing review comments...
    2 unresolved comments found.
    Would you like to resolve these first via
    /workflow-orchestration:pr-review-resolution-loop?

Developer: yes, resolve them first

  → Delegating to /workflow-orchestration:pr-review-resolution-loop...
    [resolution results shown]

  → Running /clean-code-codex:conductor on 11 code files...
    [findings presented for triage]

  → Delegating to /workflow-orchestration:final-pr-readiness-gate
    (providing prior codex findings as context)...
    Verdict: ready with follow-ups

  Next action: address 1 fix-now item, then re-run readiness.
```

### Report-only invocation

```text
Developer: /workflow-orchestration:diff-review-orchestration review feat/auth --mode report-only --base main

Coordinator:
  Diff target: feat/auth against main
  Changed files: 8 (6 code, 1 test, 1 config)
  Mode: report-only

  [runs all checks end-to-end without pausing]

  --- Diff Review Report ---
  Diff target: feat/auth against main
  File summary: 6 code, 1 test, 1 config, 0 binary
  Prior learnings: none found
  Existing comments: none
  Codex findings: 3 (1 fix-now, 2 follow-up)
  Readiness verdict: ready with follow-ups
  Skipped checks: none
  Next action: address fix-now item in src/auth/validate.ts, then merge
  discovery-reuse: no
  prior-learnings: none-found
  rescue-attempts: 0
  codex-available: yes
  final-gate-result: ready-with-follow-ups
```

### Headless invocation

```text
CI pipeline: /workflow-orchestration:diff-review-orchestration review PR #102 --mode headless --base main

Coordinator:
  Diff target: PR #102 against main
  Changed files: 5 (4 code, 1 test)
  Mode: headless

  [runs all checks end-to-end, no prompts, no pauses]

  --- Headless Review Artifact ---
  mode: headless
  Diff target: PR #102 against main
  File summary: 4 code, 1 test, 0 config, 0 docs, 0 binary
  Prior learnings: none found
  Existing comments: 1 unresolved
  Codex findings: 2 (1 fix-now, 1 follow-up)
  Readiness verdict: not ready
  Skipped checks: none
  discovery-reuse: no
  prior-learnings: none-found
  rescue-attempts: 0
  codex-available: yes
  final-gate-result: not-ready
```
