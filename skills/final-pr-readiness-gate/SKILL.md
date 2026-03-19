---
name: final-pr-readiness-gate
description: Run a final readiness pass on a stable branch or pull request diff using structured checks plus a final whole-diff review.
---

## Purpose

Use this skill when a branch or pull request diff is finally stable and you want one last high-signal readiness pass before asking for human review.

This is a final integrated gate, not an inline coding step.

## When to Use It

Activate when the developer asks for things like:

- "run the final PR readiness pass"
- "check whether this branch is ready for review"
- "do a final integrated review"
- "give me a clear ready or not-ready verdict"

## Project-Specific Inputs

Before you start, identify:

- the stable review surface;
- the repository's target branch or comparison baseline;
- the repository's real validation commands;
- any available structured checker for code-bearing diffs;
- whether the current diff is code-bearing, docs-only, or config-only.

## Default Roles

Use:

- an optional structured checker for code-bearing diffs;
- a separate final reviewer for whole-diff judgment.

If no structured checker exists, continue with the final reviewer only.

## Preconditions

Before invoking this skill:

- the intended changes are already integrated;
- the branch or diff is stable enough to review as a whole;
- obvious validation failures have already been addressed.

If the diff is still moving significantly, stabilize it first.

## Workflow

### 1. Establish the stable review surface

Before running the final gate:

1. confirm the active branch and review target;
2. verify the intended changes are already integrated;
3. identify the final review surface:
   - preferably the pull request diff against the target branch;
   - otherwise the stable branch diff against the agreed baseline.

Evaluate the integrated result, not a partial local slice.

### 2. Decide whether a structured checker applies

If the stable diff is:

- code-bearing — run the structured checker if one exists;
- docs-only or config-only — skip structured code checks and continue with the final reviewer.

Do not force code-only tooling onto a non-code diff.

### 3. Run structured checks in report-only mode

When a structured checker applies:

1. scope it to the stable integrated diff;
2. keep it report-only;
3. collect findings without automatically changing files.

Focus on:

- security issues;
- architecture or boundary drift;
- dead code or duplicate wiring;
- naming or complexity regressions;
- observability and test-quality gaps that matter on the final diff.

### 4. Triage structured findings

Classify findings into:

- blocker
- fix-now
- follow-up
- not applicable

Do not treat every automated finding as truth. Ground them in the actual code and diff.

### 5. Run a final whole-diff review

After any structured findings are triaged:

1. run a final substantive review over the whole stable diff;
2. ask the reviewer to focus on:
   - correctness regressions;
   - cross-fix interaction bugs;
   - test sufficiency;
   - contract drift;
   - security issues the earlier loops missed.

### 6. Produce an explicit readiness verdict

End with one of these outcomes:

- ready for review
- ready with follow-ups
- not ready
- stopped by user

### 7. Report clearly

Summarize:

- blockers;
- fix-now items;
- follow-ups;
- skipped-check reason, if the diff was not code-bearing;
- final readiness verdict.

The result should make the next action obvious.

## Required Gates

A final readiness pass is not complete until:

- the stable diff was evaluated as a whole;
- any structured findings were triaged when applicable;
- a final substantive review was performed;
- an explicit readiness verdict was produced.
