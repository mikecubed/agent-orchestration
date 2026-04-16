---
name: planning-orchestration
description: Create a durable implementation plan with scout discovery, reviewer critique, and optional SDD orchestration.
---

> References to plugin documentation files (e.g. `docs/workflow-artifact-templates.md`) refer to the plugin-level `docs/` directory (`../../docs/` relative to this file). Other `docs/` paths (such as artifact output destinations) refer to the target project.

## Purpose

Use this skill when a developer wants a disciplined planning workflow before implementation, especially for feature-shaped work that may need specification, planning, task generation, or explicit execution handoff.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

This skill is for planning and orchestration, not direct implementation. It may optionally compose with `sdd-workflow`, but it must fall back cleanly when SDD is unavailable.

## When to Use It

Activate when the developer asks for things like:

- "plan this feature"
- "turn this idea into a spec and tasks"
- "figure out whether this needs SDD"
- "prepare an implementation plan before we code"

Use a lighter path or skip this skill when the work is already narrow and fully scoped, such as a single-file bug fix or a straightforward review follow-up.

## Project-Specific Inputs

Before you start, identify:

- the feature or change request to plan;
- the active repository and relevant code areas;
- whether the task is feature-shaped enough to warrant SDD;
- the repository's validation commands;
- where durable planning artifacts should live;
- whether `sdd-workflow` is available in the current runtime;
- whether the repository permits `.sdd/` planning workspaces or expects another temporary planning sink;
- whether the repository declares shared workflow defaults (see `docs/workflow-defaults-contract.md`) — particularly artifact sink preferences and automation policy. If defaults are present, use them as the baseline for planning decisions described below; if absent, continue with the existing per-invocation approach.

## Default Roles

Use separate roles for:

- a **scout** that discovers factual context;
- a **planner** that produces or orchestrates the plan;
- a **reviewer** that critiques the resulting plan.

All roles may receive the discovery brief as factual context — file lists, task boundaries, validation commands, and known dependencies. Do not pass one role's conclusions or assessments to another; the reviewer must form an independent judgment from the plan artifact itself.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config**
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   Read the `planner`, `reviewer`, and `scout` keys directly. If a key is absent,
   fall back to the baked-in default for that role without prompting.
2. **Session cache** — if models were already confirmed earlier in this session,
   reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use
   the defaults below silently without prompting. Create project model config
   only when the developer wants persistent overrides.

#### Config file format

```yaml
planner: <model-name>
reviewer: <model-name>
scout: <model-name>
```

See `docs/models-config-template.md` for ready-to-copy runtime templates.

#### Default models

| Runtime       | Role    | Default model      |
|---------------|---------|--------------------|
| Copilot CLI   | Planner | `claude-opus-4.6`  |
| Copilot CLI   | Reviewer| `gpt-5.4`          |
| Copilot CLI   | Scout   | `claude-haiku-4.5` |
| Claude Code   | Planner | `claude-opus-4.6`  |
| Claude Code   | Reviewer| `claude-opus-4.6`  |
| Claude Code   | Scout   | `claude-haiku-4.5` |

## Core Rules

### 1. Plan only as much as the task shape requires

Do not run a heavy planning workflow for a narrow, fully scoped change. Use scout discovery to decide whether the request needs:

- full SDD-backed planning;
- lightweight fallback planning; or
- no separate planning at all.

### 2. Use one factual brief, not repeated discovery

Create one discovery brief per planning session when possible. The brief should capture shared facts, not conclusions:

- relevant files;
- validation commands;
- scope boundaries;
- known dependencies;
- open questions.

### 3. Prefer SDD when it materially helps

If `sdd-workflow` is available and the task is feature-shaped, the planner may orchestrate:

- `/sdd-workflow:sdd.specify`
- `/sdd-workflow:sdd.plan`
- `/sdd-workflow:sdd.tasks`

If SDD is unavailable or overkill for the task, use the fallback planning flow instead.

### 4. A durable planning artifact is mandatory

The planning session is not complete until one durable planning artifact or planning summary has been produced. Chat-only planning is not sufficient.

### 5. Rescue before abandonment

If discovery, planning, or review stalls:

1. narrow the task shape;
2. reduce context;
3. switch from SDD-backed mode to fallback mode if needed;
4. escalate to the developer only after rescue fails.

## Workflow

### 1. Run discovery (or skip it)

Before delegating to expensive planning or review work, run one lightweight discovery pass using the **scout** model.

The scout MUST produce a short factual brief covering:

- task summary;
- task shape;
- relevant files;
- validation commands;
- task boundaries;
- known dependencies;
- whether `sdd-workflow` appears available;
- shared workflow defaults status — record whether defaults were found, which planning-relevant keys were consumed (e.g., artifact sink, automation policy), and which keys were absent or fell back to per-invocation behavior;
- Prior-learnings consulted (always record matches, `none-found`, or `skipped` — see lookup below).

Use the discovery brief template from `docs/workflow-artifact-templates.md`.

#### Prior-learning lookup

During discovery, the scout checks for previously captured knowledge artifacts that relate to the current task — for example, past debugging lessons or resolution patterns stored via `knowledge-compound` (or an equivalent repository knowledge sink), as well as architectural decisions or ADRs stored in `architecture-review` or another architecture-decision sink.

**How to search**: scan the repository's knowledge directories, docs, or memory stores for artifacts whose problem description, applicability tags, or technology context overlap with the current task's domain. The search method is repository-dependent; use whatever discovery mechanism is available (file listing, grep, memory retrieval, index query). Do not assume a fixed directory or naming convention.

**Refresh-aware lookup**: when knowledge-refresh metadata exists (e.g., supersession pointers, retirement markers, or canonical designations recorded by `/workflow-orchestration:knowledge-refresh`), prefer active canonical artifacts and suppress retired, stale, or superseded duplicates. When a prior learning is marked retired or superseded, do not present it as equally reusable guidance — note the refresh status and surface the canonical replacement if one exists. When refresh metadata is absent or partial, fall back cleanly to the existing advisory lookup behavior: present all matching artifacts without filtering by refresh status.

**When matches are found**: include them in the discovery brief under a "Prior-learnings consulted" heading. List each match with a one-line summary and a path or reference. When refresh metadata is present, annotate each entry with its refresh status (e.g., `canonical`, `retired`, `stale`). The planner and reviewer receive these as optional factual context — they inform the plan but do not constrain it.

**When no matches are found**: record `Prior-learnings consulted: none-found` in the brief and continue normally. The absence of prior knowledge must never block discovery or planning.

**When lookup is skipped**: if no discoverable knowledge sink exists for the repository, or no discovery mechanism is available in the current environment, record `Prior-learnings consulted: skipped` and briefly note the reason. Use `skipped` only when the lookup could not reasonably be performed, not when a search ran successfully but returned no matches.

**Skip condition**: Skip discovery only when the request is already narrow and fully scoped. If skipped, record the skip reason in the brief.

### 2. Choose the planning mode

Based on the brief, the planner chooses one of these modes:

1. **SDD-backed planning** — when the work is feature-shaped and `sdd-workflow` is available.
2. **Fallback planning** — when SDD is unavailable, incomplete, or unnecessary.
3. **No-separate-planning** — when the work should go directly to implementation or review resolution.

Record the chosen mode and rationale in the planning artifact.

### SESSION.md write — requirements confirmed

At this gate (after the planning mode is chosen and scope is confirmed), write
`.agent/SESSION.md` with the current session state using the canonical schema
(`docs/session-md-schema.md`). Record:
- `current-task`: the overall task description
- `current-phase`: "requirements-confirmed"
- `next-action`: the exact next step after this gate
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 datetime
- `## Decisions`: decisions confirmed during requirements review (including chosen planning mode)
- `## Files Touched`: files read so far
- `## Open Questions`: unresolved questions for the developer
- `## Blockers`: active blockers (empty if none)
- `## Failed Hypotheses`: (empty — not applicable for this skill)

If the write fails (permission error, no `.agent/` directory): log a warning and continue.
The write must not block the skill's primary workflow.

### 3. Produce the draft plan

If using **SDD-backed planning**, orchestrate:

1. `/sdd-workflow:sdd.specify`
2. `/sdd-workflow:sdd.plan`
3. `/sdd-workflow:sdd.tasks`

Then normalize those outputs into one planning summary that captures:

- scope;
- validation;
- sequencing;
- recommended next action.

If using **fallback planning**, produce the same information directly without SDD.

### 4. Review the plan

Send the plan artifact to a separate reviewer and ask for only substantive issues:

- scope drift;
- missing constraints;
- weak dependency ordering;
- missing validation strategy;
- unclear handoff to execution.

#### Bounded review resend loop

If the reviewer finds substantive issues:

1. return only the unresolved planning issues to the planner;
2. revise the plan without broadening scope unnecessarily;
3. re-review the revised artifact.

Allow at most **2 resend attempts**. If the plan still does not converge after the second resend, escalate to the developer or stop the planning session.

#### Rescue policy for stalled planning

If planning stalls — discovery remains unclear, SDD orchestration fails, or review churn continues without convergence:

1. capture the blocker in the durable planning artifact;
2. narrow the task or move to fallback mode;
3. retry once with the smaller scope;
4. if rescue fails, escalate to the developer with the unresolved questions.

### 5. Publish the planning artifact and hand off

Before stopping, publish one durable planning artifact or summary that records:

1. the chosen planning mode;
2. scope and out-of-scope boundaries;
3. relevant files and validation commands;
4. sequencing or dependency notes;
5. unresolved questions;
6. recommended next action;
7. workflow outcome measures.

The artifact MUST use a repository-appropriate durable sink — for example, a committed document, PR description, issue comment, or task tracker entry. When shared workflow defaults declare an artifact sink preference for planning artifacts, use that configured sink as the default destination. When no default is configured, fall back to asking the developer or inferring from repository conventions. See `docs/workflow-defaults-contract.md` for key definitions and fallback behavior.

When appropriate, recommend the next workflow explicitly:

- `/workflow-orchestration:parallel-implementation-loop`
- direct implementation
- more planning or clarification

## Required Gates

A planning session is not complete until:

- a factual brief was created or a skip reason was recorded;
- the chosen planning mode was justified;
- the resulting plan was reviewed for substantive gaps;
- review found no unresolved substantive planning issues or the remaining issues were explicitly escalated;
- a durable planning artifact or planning summary was produced.

### Verification checklist — plan accepted

Before marking the planning session complete, confirm ALL of the following.

- [ ] Every stated requirement from the input is explicitly addressed in the output plan — PASS / FAIL
  (Scan the input against the plan section by section. An unaddressed requirement is
  a failing item.)
- [ ] Risks are documented in the plan — PASS / FAIL
- [ ] Review found no unresolved substantive planning issues — PASS / FAIL
- [ ] A durable planning artifact or planning summary has been produced — PASS / FAIL

If any item is FAIL: surface the uncovered requirement or unresolved issue.
Do not mark the plan as accepted.

## Stop Conditions

- the task is too ambiguous to bound safely;
- required repository inputs remain unknown after rescue;
- SDD orchestration fails and fallback planning also cannot produce a coherent plan;
- review or planning churn continues without convergence;
- the developer asks to stop.

Before stopping because a planning loop stalled, always attempt rescue first: narrow scope, reduce context, or switch from SDD-backed planning to fallback mode.

## Example Planning Summary

```text
Task summary: Add a planning skill and umbrella marketplace layout
Planning mode: fallback planning
Relevant files: plugin.json, .github/plugin/marketplace.json, skills/planning-orchestration/SKILL.md
Validation commands: npm test, npm run validate:runtime
Task boundaries: In scope = plugin layout, planning skill, marketplace metadata; out of scope = persistent orchestration service
Dependencies: marketplace naming decision complete
Shared workflow defaults: found — artifact sink consumed (docs/), automation policy absent (per-invocation fallback)
Recommended next action: invoke /workflow-orchestration:parallel-implementation-loop for implementation
Prior-learnings consulted:
- docs/knowledge/ci-auth-seed-ordering.md — async seed ordering breaks auth in parallel CI
Unresolved questions:
- Whether to keep the current plugin name during the first migration phase
Workflow outcome measures:
- discovery-reuse: yes
- prior-learnings: 1
- rescue-attempts: 0
```
