---
name: systematic-debugging
description: Structured four-phase debugging workflow (hypothesis → reproduce → isolate → fix) with mandatory context-hygiene pause-and-resume after N failed attempts.
---

## Purpose

Use this skill when a developer is stuck on a non-obvious bug and needs a structured,
repeatable process for moving from symptom to root cause to verified fix.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this
skill. Use a separate orchestration layer if persistent coordination is needed.

This skill is for systematic fault isolation and root-cause analysis. It is not a general
task runner or a substitute for a working test suite.

## When to Use It

Activate when the developer asks for things like:

- "help me debug this"
- "I've tried several things and nothing works"
- "walk me through isolating this bug"
- "I need a systematic approach to this failure"

Also activate when:

- a bug has resisted at least one attempted fix;
- the failure mode is non-deterministic or environment-dependent;
- multiple possible causes exist and need systematic elimination.

## Project-Specific Inputs

Before you start, identify:

- a concise description of the symptom (what fails, what is expected);
- the repository's validation commands and the specific failing test or reproduction steps;
- the relevant code area (files, modules, subsystems);
- `max-failed-attempts` — the number of failed hypotheses before the skill triggers a
  context-hygiene pause (default: **3**);
- where durable debugging artifacts should live (default: `.agent/SESSION.md`).

If `max-failed-attempts` is not provided by the developer, use **3**.

## Default Roles

Use separate roles for:

- a **scout** that produces the initial factual context brief — reproduction steps, affected
  files, known constraints, and error messages;
- an **investigator** (implementer) that forms and tests hypotheses;
- a **reviewer** that checks proposed fixes for correctness, regressions, and scope.

All roles may receive the discovery brief as factual context. Do not share the investigator's
working hypotheses with the reviewer before a fix is proposed — the reviewer must assess the
fix independently.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is absent, fall
   back to the baked-in default for that role.

2. **Session cache** — if models were already confirmed earlier in this session,
   reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use
   the defaults below silently without prompting. Create project model config
   only when the developer wants persistent overrides.

#### Default models

| Runtime       | Role          | Default model      |
|---------------|---------------|--------------------|
| Copilot CLI   | Investigator  | `claude-opus-4.6`  |
| Copilot CLI   | Reviewer      | `gpt-5.4`          |
| Copilot CLI   | Scout         | `claude-haiku-4.5` |
| Claude Code   | Investigator  | `claude-opus-4.6`  |
| Claude Code   | Reviewer      | `claude-opus-4.6`  |
| Claude Code   | Scout         | `claude-haiku-4.5` |

## Core Rules

### 1. Hypotheses are falsifiable, time-bounded, and recorded

Each hypothesis must:

1. state a specific proposed cause;
2. state a specific test that would confirm or refute it;
3. state the expected observable difference between confirmation and refutation.

Do not proceed to the next hypothesis until the current one is confirmed or explicitly
ruled out with evidence.

### 2. Failed hypotheses are never retried

Once a hypothesis is ruled out, record it in `## Failed Hypotheses` in `.agent/SESSION.md`
with:
- what was tried;
- what was observed;
- why this cause is ruled out.

**A hypothesis in `## Failed Hypotheses` must never be retried**, including in resumed
sessions. Before forming new hypotheses, scan this section and treat all listed entries as
definitively ruled out.

### 3. Context hygiene is mandatory after N failures

When the failed-attempt counter reaches `max-failed-attempts`:

1. Stop forming new hypotheses.
2. Write ALL current state to `.agent/SESSION.md`, including every ruled-out hypothesis in
   `## Failed Hypotheses` marked DO-NOT-RETRY.
3. Announce the pause to the developer: "Context hygiene pause — [N] hypotheses failed.
   Saved to SESSION.md. Starting fresh session with only confirmed facts and ruled-out paths."
4. In the resumed session, load ONLY:
   - confirmed reproduction steps;
   - ruled-out areas (from `## Failed Hypotheses`);
   - last isolation state;
   - any confirmed-good sub-components.
5. Do **not** re-attempt any hypothesis in `## Failed Hypotheses`.

### 4. Fix requires a failing test first

Before applying any fix:

1. confirm the bug is reproducible with a specific failing test or a documented reproduction
   sequence;
2. apply the fix;
3. confirm the failing test now passes;
4. confirm no previously-passing tests now fail.

Do not apply a fix that cannot be validated by a test or a reproducible sequence.

## Workflow

### Phase 1 — Hypothesis formation

Run one lightweight scout pass to produce a **factual context brief**:

- symptom description;
- error messages or failing test output (exact);
- affected files and modules;
- known constraints (environment, dependencies, recent changes);
- open questions (things that must be answered before a hypothesis can be formed).

Use the discovery brief template from `docs/workflow-artifact-templates.md`.

**Skip condition**: Skip the scout when a complete factual brief already exists (e.g., the
developer provided full reproduction steps, error text, and affected files). Record the skip
reason in the brief.

Based on the brief, form a ranked list of hypotheses ordered by:

1. likelihood given the symptom;
2. cost to test (cheapest first when likelihoods are similar).

Announce the hypothesis list to the developer before testing any hypothesis. Allow the
developer to add, remove, or reorder before proceeding.

Write `.agent/SESSION.md` at the end of this phase as a complete, schema-compliant
document (see `docs/session-md-schema.md`). All five YAML frontmatter fields are required
on every write — do not write a partial file:
- `current-task`: the bug description being investigated
- `current-phase`: `"hypothesis"`
- `next-action`: `"begin reproduction"`
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 timestamp

Include all five `##` sections (`Decisions`, `Files Touched`, `Open Questions`, `Blockers`,
`Failed Hypotheses`), updating each with the current session state. An empty body is
acceptable for sections with nothing to record yet.

### Phase 2 — Reproduce

Attempt to reproduce the bug using the top hypothesis.

1. Run the failing test or reproduction sequence.
2. Confirm the symptom is reproducible as described.
3. If not reproducible: record the non-reproduction in `## Failed Hypotheses`, mark the
   hypothesis ruled out, and return to Phase 1 to form the next hypothesis.
4. If reproducible: proceed to Phase 3.

Write `.agent/SESSION.md` at the end of this phase as a complete, schema-compliant
document (see `docs/session-md-schema.md`). All five YAML frontmatter fields are required
on every write — do not write a partial file:
- `current-task`: the bug description being investigated
- `current-phase`: `"reproduce"`
- `next-action`: `"begin isolation"`
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 timestamp

Include all five `##` sections (`Decisions`, `Files Touched`, `Open Questions`, `Blockers`,
`Failed Hypotheses`), updating each with the current session state. An empty body is
acceptable for sections with nothing to record yet.

### Phase 3 — Isolate

Narrow the reproduction to the smallest failing case:

1. Identify the minimal input, configuration, or code state that produces the symptom.
2. Identify the specific code path or component responsible.
3. Rule out adjacent components that are functioning correctly — record each as ruled-out in
   `## Failed Hypotheses` if they were previously considered as causes.
4. If the hypothesis is refuted during isolation: record it in `## Failed Hypotheses`, return
   to Phase 1 for the next hypothesis, and increment the failed-attempt counter.
5. If `max-failed-attempts` is reached: trigger the **context-hygiene cycle** (see Core
   Rules §3) before continuing.

Write `.agent/SESSION.md` at the end of this phase as a complete, schema-compliant
document (see `docs/session-md-schema.md`). All five YAML frontmatter fields are required
on every write — do not write a partial file:
- `current-task`: the bug description being investigated
- `current-phase`: `"isolate"`
- `next-action`: `"form fix proposal"`
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 timestamp

Include all five `##` sections (`Decisions`, `Files Touched`, `Open Questions`, `Blockers`,
`Failed Hypotheses`), updating each with the current session state. An empty body is
acceptable for sections with nothing to record yet.

### Phase 4 — Fix

1. Propose the fix to the developer before applying. Include:
   - the root cause (one sentence);
   - the proposed change;
   - the test that will confirm the fix.
2. Apply the fix.
3. Confirm the failing test now passes.
4. Confirm no previously-passing tests now fail.
5. Write a root-cause note to `.agent/SESSION.md` `## Decisions`.
6. Commit the fix with a message that names the root cause.

Write `.agent/SESSION.md` at the end of this phase as a complete, schema-compliant
document (see `docs/session-md-schema.md`). All five YAML frontmatter fields are required
on every write — do not write a partial file:
- `current-task`: the bug description being investigated
- `current-phase`: `"fix-complete"`
- `next-action`: `"done"`
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 timestamp

Include all five `##` sections (`Decisions`, `Files Touched`, `Open Questions`, `Blockers`,
`Failed Hypotheses`), updating each with the current session state including the root-cause
note in `## Decisions`. An empty body is acceptable for sections with nothing to record.

If the proposed fix does not resolve the bug: do not mark the hypothesis as confirmed.
Increment the failed-attempt counter, record the failed fix attempt in `## Failed Hypotheses`,
and return to Phase 1.

### Context-hygiene pause

When triggered (failed-attempt counter = `max-failed-attempts`):

Write `.agent/SESSION.md` as a complete, schema-compliant document (see
`docs/session-md-schema.md`) — do not write a partial file. All five YAML frontmatter
fields are required:
- `current-task`: the bug description being investigated
- `current-phase`: `"context-hygiene-pause"`
- `next-action`: `"resume in fresh session — load confirmed steps + Failed Hypotheses only"`
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 timestamp

Include all five `##` sections (`Decisions`, `Files Touched`, `Open Questions`, `Blockers`,
`Failed Hypotheses`), populating `## Failed Hypotheses` with every ruled-out hypothesis
(DO-NOT-RETRY). Announce the pause. Begin a fresh session loading only the allowed context
(see Core Rules §3). The fresh session MUST NOT re-attempt any hypothesis in
`## Failed Hypotheses`.

## Required Gates

### Phase gate (per phase)

A phase is not complete until:

- the phase objective (hypothesis formed / bug reproduced / bug isolated / fix confirmed) is met;
- SESSION.md has been written with the correct `current-phase` value for this phase;
- any ruled-out hypotheses are recorded in `## Failed Hypotheses`.

### Verification checklist — fix complete

Before declaring the debugging session done, confirm ALL of the following.

- [ ] The bug is reproducible with a specific test or documented sequence — PASS / FAIL
- [ ] The fix resolves the failing test (test now passes) — PASS / FAIL
- [ ] No previously-passing tests fail after the fix — PASS / FAIL
- [ ] Root-cause note has been written to SESSION.md `## Decisions` — PASS / FAIL
- [ ] Every ruled-out hypothesis is recorded in SESSION.md `## Failed Hypotheses` — PASS / FAIL

If any item is FAIL: surface the failing item and do not declare the session done.

## Stop Conditions

- the bug is not reproducible after exhausting all available hypotheses and a rescue attempt
  (context-hygiene pause) has been completed;
- the developer chooses to stop rather than continue in a fresh session after context-hygiene
  rescue;
- the fix causes regressions that cannot be resolved without significant scope expansion;
- the developer asks to stop.

Before stopping, produce a **durable debugging summary** that records:
- symptom description;
- hypotheses attempted and their outcomes;
- the `## Failed Hypotheses` list from SESSION.md;
- last isolation state;
- reason for stopping and recommended next steps.

"Durable" means written to a repository-appropriate sink — a committed document, a PR comment,
or an issue — not only to chat. Chat-only summaries do not satisfy this requirement.

## Example

```text
Symptom: UserService.authenticate returns null for valid credentials in CI but not locally.
max-failed-attempts: 3

Phase 1 — Hypothesis:
  H1: DB fixture seed order differs between local and CI (most likely)
  H2: Environment variable AUTH_SECRET is unset in CI (cheap to check)
  H3: Session store uses in-memory TTL that expires faster in CI
  Developer approved order: H2 → H1 → H3

Phase 2 — Reproduce (H2):
  Added AUTH_SECRET check to CI config. Bug still present. H2 ruled out.
  Failed hypotheses: 1 / 3

Phase 1 (revised) → Phase 2 — Reproduce (H1):
  Ran seed script with explicit order. Bug reproduced reliably.

Phase 3 — Isolate:
  Minimal case: UserService.authenticate called before seed index 3 (admin fixture) inserts.
  Confirmed: all other authenticate calls pass. Race condition in seed ordering.

Phase 4 — Fix:
  Root cause: CI seed runs asynchronously; admin fixture sometimes missing at query time.
  Fix: await seed completion before authenticate call in CI setup hook.
  Failing test: auth.test.js > authenticates admin user
  After fix: test passes, 0 regressions.
  Committed: "fix: await seed completion in CI to prevent auth race condition"

Durable debugging summary: committed to docs/debug-session-2025-01-15.md
```
