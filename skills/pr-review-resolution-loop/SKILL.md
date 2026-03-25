---
name: pr-review-resolution-loop
description: Resolve pull request review comments with disciplined triage, scoped fixes, thread closure, and final validation.
---

## Purpose

Use this skill when a developer wants to work through pull request or branch review feedback in a disciplined loop.

This skill is for review resolution, not first-pass implementation. It assumes there is already an active branch or review surface and a set of comments or threads to evaluate.

## When to Use It

Activate when the developer asks for things like:

- "work through the review comments"
- "decide which comments should actually be fixed"
- "address the review feedback and close the threads"
- "reply to the comments we are declining"

## Project-Specific Inputs

Before you start, identify:

- the active branch or review surface;
- where review comments and threads are collected;
- the repository's validation commands;
- how the team expects resolved comments to be replied to and closed;
- whether the repository allows parallel fix tracks or prefers serial review fixes.

## Default Roles

Use separate roles for:

- an **implementer** that makes accepted fixes;
- a **reviewer** that inspects each fix and the final integrated result.

In Claude Code, spawn each role as a separate agent using the Agent tool. Pass the implementer the exact fix scope and constraints. Pass the reviewer only the resulting diff and the review criteria.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   These are plain YAML files (no markdown, no fenced blocks). Read the `implementer` and `reviewer` keys directly. If a key is absent, fall back to the baked-in default for that role — do not re-prompt for a key that is missing.

2. **Session cache** — if models were already confirmed earlier in this session, reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, show the defaults below, ask the user to confirm or override them once, then cache the answer for the rest of the session.

#### Config file format

The config files are plain YAML (not markdown). Create the file for the active runtime and set only the keys you want to override — absent keys fall back to the baked-in defaults. The keys for this skill are:

```yaml
implementer: <model-name>
reviewer: <model-name>
```

See `docs/models-config-template.md` in this plugin for ready-to-copy templates for both runtimes.

#### Default models

| Runtime       | Role        | Default model       |
|---------------|-------------|---------------------|
| Copilot CLI   | Implementer | `claude-opus-4.6`   |
| Copilot CLI   | Reviewer    | `gpt-5.4`           |
| Claude Code   | Implementer | `claude-opus-4.6`   |
| Claude Code   | Reviewer    | `claude-opus-4.6`   |

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

### 3. Close the loop on every thread

Every review thread should end in one of these states:

- fixed and resolved;
- declined with a clear rationale;
- intentionally left open because a real blocker remains.

Do not stop with code changes only.

## Workflow

### 1. Gather review context

Before making changes:

1. collect open review threads and relevant general comments;
2. read the current code and nearby tests;
3. confirm the latest branch diff and validation status.

Do not act on comment text alone if the code has moved.

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

### 3. Batch independent fixes when safe

If multiple accepted fixes are independent:

1. group them into separate fix tracks;
2. keep tightly coupled fixes serial;
3. invoke `/agent-workflow-skills:parallel-implementation-loop` for each independent fix batch.

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

### 6. Reply to and resolve review threads

After each fix or decline:

- if fixed, reply briefly with what changed and resolve the thread;
- if declined, reply with the concrete reason and resolve it if appropriate;
- if clarification is still needed, post the question and leave the thread open intentionally.

Silent declines are not allowed.

### 7. Final validation

After all relevant review items are handled:

1. run the repository's real quality gates;
2. verify any new behavior has test coverage;
3. invoke `/agent-workflow-skills:final-pr-readiness-gate` on the stable diff;
4. publish one durable review-resolution summary that captures decisions, validation, and remaining concerns when the repository has a place for it.

## Example Review-Resolution Summary

Use a durable summary shape so another reviewer or contributor can quickly see what was fixed, declined, or left open. For example:

```text
Review surface: PR #128 against main
Reviewer source: GitHub review
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
```

Prefer the repository's canonical review-resolution artifact template when one exists.

### Example Thread Responses

Use short, concrete replies that make the outcome obvious. For example:

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

### Review batch gate

The batch is not complete until:

- all relevant review items are handled;
- repository validation passes;
- the final readiness workflow has been run;
- remaining issues are explicitly reported.

## Stop Conditions

- the review surface has moved enough that the original comments are no longer reliable;
- accepted fixes begin conflicting on the same files or contract;
- reviewer and implementer disagree without a repository rule to break the tie;
- required validation commands or thread-resolution expectations are still unknown;
- the developer asks to stop.

When that happens, stop batching, restate the blocker, and continue only after the review surface is stable again.
