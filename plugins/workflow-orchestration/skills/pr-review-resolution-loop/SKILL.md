---
name: pr-review-resolution-loop
description: Resolve pull request review comments with disciplined triage, scoped fixes, thread closure, and final validation.
---

## Purpose

Use this skill when a developer wants to work through pull request or branch review feedback in a disciplined loop.

This skill is for review resolution, not first-pass implementation. It assumes there is already an active branch or review surface and a set of comments or threads to evaluate.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "work through the review comments"
- "decide which comments should actually be fixed"
- "address the review feedback and close the threads"
- "reply to the comments we are declining"

## Project-Specific Inputs

Before you start, identify:

- the active branch or review surface;
- the review platform or source system in use, such as GitHub, Azure DevOps, or a local review artifact;
- where review comments and threads are collected;
- how that platform models discussion items, thread states, and resolution actions;
- the repository's validation commands;
- how the team expects resolved comments to be replied to and closed;
- whether the repository allows parallel fix tracks or prefers serial review fixes.

## Default Roles

Use separate roles for:

- an **implementer** that makes accepted fixes;
- a **reviewer** that inspects each fix and the final integrated result.

In Claude Code, spawn each role as a separate agent using the Agent tool. Pass the implementer the exact fix scope and constraints. Pass the reviewer the resulting diff and the review criteria.

Both roles may receive the discovery brief (see Workflow Step 1) as factual context — file lists, task boundaries, validation commands, and comparison baseline. Do not pass one role's conclusions or assessments to the other; the reviewer must form an independent judgment from the diff.

### Escalation: Fleet / Agent Team Mode

If the active runtime offers a higher-cost orchestration mode such as a Fleet command or Claude Code agent teams, use it only as an optional escalation path for large review batches.

Default to standard implementer and reviewer agents first. Before escalating, tell the developer why the larger team would help and ask whether they want the added token spend.

Escalate only when:

1. many accepted review items can be fixed independently;
2. the review surface is large enough that a single implementer would become a bottleneck;
3. specialized fix roles or audit roles would materially improve coverage;
4. the developer explicitly opts in.

If team mode is approved, still keep one durable triage view and one final reviewer accountable for the integrated result.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   These are plain YAML files (no markdown, no fenced blocks). Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is absent, fall back to the baked-in default for that role — do not re-prompt for a key that is missing.

2. **Session cache** — if models were already confirmed earlier in this session, reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, show the defaults below, ask the user to confirm or override them once, then cache the answer for the rest of the session.

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

### 1. Do not assume every review comment is correct

Every review item must be triaged into one of these outcomes:

- fix
- decline
- clarify first

Never churn the code just to satisfy a weak, stale, or incorrect comment.

### 2. Accepted fixes still follow TDD and design rules

For comments that become fixes:

1. add or adjust failing tests first when behavior changes;
2. implement the smallest fix that resolves the issue;
3. refactor only while tests stay green.

### 3. Close the loop on every discussion item

Every review thread or platform-equivalent discussion item should end in one of these states:

- fixed and resolved;
- declined with a clear rationale;
- intentionally left open because a real blocker remains.

Do not stop with code changes only.

## Workflow

### 1. Gather review context

Before making changes:

1. collect open review threads, comment chains, or equivalent discussion items, plus relevant general comments;
2. read the current code and nearby tests;
3. confirm the latest branch diff and validation status.

Do not act on comment text alone if the code has moved.

#### Bounded discovery brief

Before triaging, use the **scout** model (see Model Selection) to produce a short discovery brief covering:

- the review surface and comparison baseline;
- relevant files and validation commands;
- task boundaries — what is in scope vs. out of scope for this review batch;
- open questions requiring developer input, if any.

Use the discovery brief template from `docs/workflow-artifact-templates.md` with `Task shape: review-resolution-batch`.

**Skip condition**: Skip discovery when the review batch is already narrow and fully scoped — a single comment on a single file, or a batch where every item was already triaged in a prior pass. When skipped, record the skip reason in the brief.

Pass the completed brief to the coordinator for triage and as factual context to implementers and reviewers in subsequent steps. Do not allow the brief to persist beyond the current review batch.

### 2. Triage review items

For each item, classify whether it is:

- a correctness issue;
- a security issue;
- a missing or weak test;
- a contract mismatch;
- an architecture concern;
- stale, already fixed, or out of scope.

Then decide whether to fix, decline, or clarify first.

Process accepted items in this default priority order:

1. security issues;
2. correctness issues;
3. contract mismatches;
4. missing or weak tests;
5. architecture concerns;
6. lower-priority polish.

### SESSION.md write — triage complete

At this gate (after all review items are triaged), write `.agent/SESSION.md`. Record:
- `current-task`: the overall PR review task description
- `current-phase`: "triage-complete"
- `next-action`: "begin fix batch 1"
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 datetime
- `## Decisions`: triage decisions (accepted, declined, clarify-first) per item
- `## Files Touched`: files read so far
- `## Open Questions`: items needing developer clarification
- `## Blockers`: active blockers (empty if none)
- `## Failed Hypotheses`: (empty — not applicable for this skill)

If the write fails: log a warning and continue. Do not block triage completion.

### 3. Batch independent fixes when safe

If multiple accepted fixes are independent:

1. group them into separate fix tracks;
2. keep tightly coupled fixes serial;
3. invoke `/workflow-orchestration:parallel-implementation-loop` for each independent fix batch;
4. use Fleet or agent-team mode only for batches that were explicitly approved for the higher-cost path.

If review items interact heavily, resolve them serially.

### 4. Implement each accepted fix

For every accepted fix:

1. give the implementer:
   - the exact review item;
   - the intended resolution;
   - the affected files;
   - the needed tests;
   - the scope boundary;
2. require minimal, focused changes only.

### 5. Review each fix

After each fix:

1. have a separate reviewer inspect the resulting diff;
2. ask for only substantive issues:
   - correctness regressions;
   - missing edge-case coverage;
   - contract drift;
   - security concerns;
   - material design regressions.

#### Bounded fix-review resend loop

When the reviewer finds substantive issues in a fix:

1. return the fix to the implementer with the specific issues and the reviewer's expected resolution;
2. the implementer revises and resubmits;
3. the reviewer re-inspects the revised diff.

Allow at most **2 resend attempts** per fix. If the fix still has unresolved substantive issues after the second resend:

- escalate to the developer with a summary of the disagreement or stall, including what was attempted in each round;
- or re-scope the fix to a smaller, defensible change that both sides accept.

Do not loop indefinitely. A fix that cannot converge in two rounds needs human judgment or a narrower scope.

#### Rescue policy for stalled fixes

If a fix attempt stalls — the implementer cannot make progress, the change grows beyond its original scope, or successive attempts do not move closer to resolving the review item:

1. pause the fix and capture what was attempted and where it stalled;
2. re-scope to the smallest change that still addresses the core concern;
3. if re-scoping is not viable, escalate to the developer with a clear description of the blocker.

Do not allow a single stalled fix to block the rest of the review batch. Move to the next independent fix and return to the stalled item after the developer provides guidance or approves the re-scoped change.

#### Disagreement resolution: fix-vs-decline conflict

When the reviewer and implementer disagree on whether a comment should be fixed or declined:

1. record the disagreement with each side's rationale;
2. allow one re-review round where both sides see the other's reasoning;
3. if the conflict persists after the re-review, escalate to the developer with both rationales and the comment context.

Do not allow a fix-vs-decline disagreement to stall the rest of the batch. Move to the next independent item and return to the disputed comment after escalation or re-scoping resolves it.

### 6. Reply to and close review discussions

After each fix or decline:

- if fixed, reply briefly with what changed and use the platform-appropriate action to mark the discussion addressed;
- if declined, reply with the concrete reason and apply the repository's expected decline or close action when appropriate;
- if clarification is still needed, post the question and leave the discussion open intentionally.

GitHub and Azure DevOps expose different thread status labels, but the workflow outcome should still map to the same three states above: fixed, declined, or intentionally left open.

Silent declines are not allowed.

### 7. Final validation

After all relevant review items are handled:

1. run the repository's real quality gates;
2. verify any new behavior has test coverage;
3. invoke `/workflow-orchestration:final-pr-readiness-gate` on the stable diff;
4. publish one durable review-resolution summary using the review-resolution summary template from `docs/workflow-artifact-templates.md`. The summary MUST capture decisions, validation outcome, and remaining concerns;
5. include a workflow outcome-measures block in the summary using the outcome-measures template from `docs/workflow-artifact-templates.md`. The block MUST include at minimum: `discovery-reuse`, `rescue-attempts`, and `re-review-loops`.

## Example Review-Resolution Summary

Use a durable summary shape so another reviewer or contributor can quickly see what was fixed, declined, or left open. For example:

```text
Review surface: PR 128 against main
Reviewer source: Azure DevOps PR review
Decisions:
- comment-14 | correctness | fixed | Added a null-input guard and coverage for the empty payload path
- comment-19 | test | fixed | Strengthened the regression test to assert the exact status code
- comment-23 | stale | declined | Current diff already removed the old helper the comment referred to
Validation:
- npm test
- npm run validate:plugin
Result:
- pass
Remaining concerns:
- Waiting on reviewer confirmation for one clarify-first thread about ownership of normalization
Outcome measures:
  discovery-reuse: yes
  rescue-attempts: 0
  re-review-loops:
    comment-14: 0
    comment-19: 1
    comment-23: 0
```

Prefer the repository's canonical review-resolution artifact template when one exists.

### Example Thread Responses

Use short, concrete replies that make the outcome obvious, then apply the matching platform action. For example:

- fixed: `Fixed in 9ab12cd by tightening the null-path guard and adding coverage for the empty-input case.`
- declined: `Declining this one because the current contract intentionally allows duplicate labels during draft creation. Keeping the existing behavior.`
- clarify first: `I could address this either in the serializer or in the caller. Which boundary did you intend to own the normalization rule?`

## Required Gates

### Comment gate

A comment is not complete until:

- it was triaged explicitly;
- fix, decline, or clarify-first was chosen;
- the thread was resolved or intentionally left open with a stated blocker.

### Fix gate

A fix is not complete until:

- tests changed first when applicable;
- the issue is actually resolved;
- review finds no unresolved substantive issue;
- touched files stay scoped to the real concern.

### SESSION.md write — fix batch complete

At this gate (per fix batch, after the fix gate passes), write `.agent/SESSION.md`. Record:
- `current-task`: the overall PR review task description
- `current-phase`: "fix-batch-[N]-complete" (substitute the batch number)
- `next-action`: "begin next fix batch or run post-fix validation"
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 datetime
- `## Decisions`: which items were fixed in this batch, which remain pending
- `## Files Touched`: files changed in this fix batch
- `## Open Questions`: any open questions from the fix review
- `## Blockers`: active blockers (empty if none)
- `## Failed Hypotheses`: (empty — not applicable for this skill)

If the write fails: log a warning and continue. Do not block fix batch completion.

### Review batch gate

The batch is not complete until:

- all relevant review items are handled;
- repository validation passes;
- the final readiness workflow has been run;
- a durable review-resolution summary has been published using the template from `docs/workflow-artifact-templates.md`;
- remaining issues are explicitly reported.

### Verification checklist — resolution loop complete

Before declaring the resolution loop done, confirm ALL of the following.

**Per-thread gate**
- [ ] Every review thread has a recorded resolution state: ACCEPTED or DECLINED — PASS / FAIL
  (A thread with no recorded state is a failing item — silent declines are not permitted.)
- [ ] Declined threads have a recorded reason visible in the resolution artifact — PASS / FAIL

**Post-fix gate**
- [ ] Post-fix validation ran on the final diff and exited 0 — PASS / FAIL
- [ ] No previously-passing tests now fail — PASS / FAIL
- [ ] Durable resolution summary artifact has been produced — PASS / FAIL

If any item is FAIL: list the unresolved thread IDs or failing validation output.
Do not declare the loop done.

## Stop Conditions

- the review surface has moved enough that the original comments are no longer reliable;
- accepted fixes begin conflicting on the same files or contract;
- reviewer and implementer still disagree after exhausting the bounded resend loop, rescue policy, and disagreement resolution — two resend attempts were made, re-scoping was attempted or ruled out, and any fix-vs-decline conflict was escalated after one re-review;
- required validation commands or thread-resolution expectations are still unknown;
- the developer asks to stop.

Before stopping for a disagreement or stall, always attempt rescue first: apply the bounded resend loop (Step 5), then the rescue policy, then disagreement resolution for fix-vs-decline conflicts. Only stop after those options are exhausted or the developer explicitly declines re-scoping.

When a stop condition is met, stop batching, restate the blocker, and continue only after the review surface is stable again.
