---
name: brainstorm-ideation
description: Pre-spec Socratic ideation skill that surfaces constraints, risks, and trade-offs through structured dialogue before committing to a direction.
---

## Purpose

Use this skill when a developer has a rough idea but is not yet ready for formal specification. This is **pre-spec ideation** — it sits before `sdd.specify` in the workflow and is distinct from `planning-orchestration`:

- `brainstorm-ideation`: surfaces constraints, trade-offs, and risks BEFORE the developer knows what to build.
- `planning-orchestration`: structures work for something already decided.
- `sdd.specify`: formalizes requirements for something ready to spec.

The skill drives a Socratic dialogue to help the developer clarify intent, discover hidden constraints, weigh competing approaches, and converge on a direction — then hands off to `sdd.specify` with a durable ideation brief.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "I have an idea but I'm not sure what to build yet"
- "help me think through this feature before I spec it"
- "what are the trade-offs between these approaches?"
- "I got a feature request — what constraints should I consider?"

Use this skill when:

- the developer has a rough idea but cannot articulate requirements yet;
- before calling `sdd.specify` — to clarify what they actually want to build;
- when exploring multiple competing approaches;
- when a feature request needs constraint discovery before estimation.

Do **not** use this skill when:

- the developer already knows exactly what to build → redirect to `sdd.specify` directly;
- the work is already scoped and planned → use `planning-orchestration` or `parallel-implementation-loop`;
- the request is a narrow bug fix or review follow-up.

## Project-Specific Inputs

Before you start, identify:

- the rough idea, feature request, or problem area to explore;
- the active repository and relevant code areas (if known);
- any existing constraints the developer has already mentioned;
- the repository's validation commands;
- whether `sdd-workflow` is available in the current runtime;
- where durable ideation artifacts should live.

## Default Roles

Use separate roles for:

- a **scout** that discovers factual context about the codebase and domain;
- an **ideator** that drives the Socratic dialogue and produces the ideation brief;
- a **reviewer** that sanity-checks the ideation brief before handoff.

All roles receive the discovery output as a factual context brief — file lists, domain boundaries, validation commands, and known dependencies. Do not pass one role's conclusions or assessments to another; the reviewer must form an independent judgment from the ideation brief artifact itself.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config**
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   Read the `implementer`, `reviewer`, and `scout` keys directly. If a key is
   absent, fall back to the baked-in default for that role without prompting.
2. **Session cache** — if models were already confirmed earlier in this session,
   reuse them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use
   the defaults below silently without prompting. Create project model config
   only when the developer wants persistent overrides.

#### Config file format

```yaml
implementer: <model-name>
reviewer: <model-name>
scout: <model-name>
```

See `docs/models-config-template.md` for ready-to-copy runtime templates.

#### Default models

| Runtime       | Role         | Default model      |
|---------------|--------------|--------------------|
| Copilot CLI   | Implementer  | `claude-opus-4.6`  |
| Copilot CLI   | Reviewer     | `gpt-5.4`          |
| Copilot CLI   | Scout        | `claude-haiku-4.5` |
| Claude Code   | Implementer  | `claude-opus-4.6`  |
| Claude Code   | Reviewer     | `claude-opus-4.6`  |
| Claude Code   | Scout        | `claude-haiku-4.5` |

## Workflow

### 1. Run discovery

Before starting the Socratic dialogue, run one lightweight discovery pass using the **scout** model.

The scout MUST produce a short factual brief covering:

- rough idea summary as stated by the developer;
- relevant code areas (if identifiable);
- domain context and existing patterns;
- validation commands;
- known constraints or dependencies.

Use the discovery brief template from `docs/workflow-artifact-templates.md`.

**Skip condition**: Skip discovery only when the developer provides enough context directly. If skipped, record the skip reason.

### 2. Socratic dialogue — 5 steps

Drive a structured Socratic dialogue with the developer. Each round asks **≤5 questions** — never more. Batch related questions together.

#### Step 2a. Understand the idea

Ask open questions to capture the core intent. Focus on what problem the developer is trying to solve and who the users or consumers are. Limit to 1–3 questions in this round.

#### Step 2b. Surface constraints

Probe for constraints the developer may not have articulated:

- technical constraints (APIs, compatibility, performance);
- resource constraints (time, team size, dependencies);
- scope constraints (what is explicitly NOT in scope).

#### Step 2c. Explore trade-offs

Present 2–3 competing approaches with explicit trade-offs for each. Structure each approach as:

- **Approach name** — one-line summary
- **Pros** — concrete advantages
- **Cons** — concrete disadvantages
- **Risk** — the biggest risk of this approach

#### Step 2d. Identify risks

Surface the top 3 risks the developer may not have considered. For each risk:

- describe the risk;
- estimate likelihood (low / medium / high);
- suggest a mitigation or investigation step.

#### Step 2e. Converge

Summarize the ideation dialogue into a convergence summary:

- restate the core intent;
- list confirmed constraints;
- state the recommended approach (or top 2 if the developer has not yet decided);
- list unresolved questions.

Ask the developer: **"Are you ready to hand off to `sdd.specify`?"**

If yes → produce the durable ideation brief and recommend invoking `sdd.specify`.
If no → return to the relevant Socratic step for further exploration.

### 3. Produce the durable ideation brief

At the end of the dialogue, produce a **durable ideation brief artifact** containing:

1. **Core intent** — one paragraph capturing what the developer wants to build and why.
2. **Key constraints** — technical, resource, and scope constraints identified.
3. **Approaches considered** — each approach with its trade-offs (from Step 2c).
4. **Top risks** — ranked risks with mitigations (from Step 2d).
5. **Recommended next step** — usually: invoke `/sdd-workflow:sdd.specify` with this brief as context.
6. **Unresolved questions** — anything that needs further investigation.

The brief MUST use a repository-appropriate durable sink — for example, a committed document, PR description, issue comment, or task tracker entry.

### 3b. Reviewer sanity-check

Before writing `SESSION.md` and handing off, have the **reviewer** role inspect the
produced ideation brief independently. Pass the reviewer only the brief artifact — do not
pass the dialogue history or the implementer's working notes.

The reviewer checks:
1. Core intent is unambiguous and confirmed by the developer.
2. At least two trade-off approaches are present with explicit trade-offs.
3. Top risks are identified and ranked.
4. No approach was excluded without a recorded rationale.
5. The recommended next step is appropriate given the constraints identified.

If the reviewer finds a gap: return the brief to the implementer with the specific issue.
The implementer revises and the reviewer re-inspects. Allow at most **1 resend attempt**.
If the gap is still unresolved after one resend, escalate to the developer and continue.

Once the reviewer approves (or escalation is accepted), proceed to the SESSION.md write.

### SESSION.md write — ideation complete

At this gate (after the ideation brief is reviewed), write `.agent/SESSION.md` with the
current session state using the canonical schema (`docs/session-md-schema.md`). Record:

- `current-task`: the overall ideation topic
- `current-phase`: "ideation-complete"
- `next-action`: "invoke sdd.specify with ideation brief" (or as decided with the developer)
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 datetime
- `## Decisions`: key decisions made during ideation (approach chosen, constraints confirmed)
- `## Files Touched`: files read during discovery
- `## Open Questions`: unresolved questions for the developer
- `## Blockers`: active blockers (empty if none)
- `## Failed Hypotheses`: approaches considered and rejected, with reasons

If the write fails (permission error, no `.agent/` directory): log a warning and continue.
The write must not block the skill's primary workflow.

### 4. Hand off

When the ideation brief is complete, recommend the next workflow explicitly:

- `/sdd-workflow:sdd.specify` — the most common next step;
- `/workflow-orchestration:planning-orchestration` — if the developer wants to plan before specifying;
- more ideation — if the developer wants to explore further.

## Required Gates

An ideation session is not complete until:

- all 5 Socratic steps were completed (or the developer explicitly stopped early);
- a durable ideation brief artifact was produced;
- the brief was reviewed for completeness by the reviewer role.

### Verification checklist — ideation accepted

Before marking the ideation session complete, confirm ALL of the following.

- [ ] Core intent captured and confirmed by developer — PASS / FAIL
- [ ] At least 2 trade-off approaches surfaced — PASS / FAIL
- [ ] Top risks identified — PASS / FAIL
- [ ] Durable ideation brief artifact produced — PASS / FAIL
- [ ] Reviewer approved brief (or escalation accepted) — PASS / FAIL
- [ ] SESSION.md written with correct phase — PASS / FAIL

If any item is FAIL: surface the gap and return to the relevant Socratic step.
Do not mark the ideation as accepted.

## Stop Conditions

- the developer already knows what to build → redirect to `sdd.specify` directly;
- the developer explicitly stops the ideation;
- the idea is too vague to make progress after 3 full dialogue rounds;
- required repository inputs remain unknown after rescue;
- dialogue stalls without convergence.

Before stopping because a dialogue stalled, always attempt rescue first: narrow the scope of exploration, reduce the number of open questions, or focus on the single most promising approach. Produce a partial durable ideation brief summary capturing whatever was learned, even if incomplete.

## Example Ideation Brief

```text
Core intent:
  Add real-time collaboration to the document editor so multiple users can
  edit the same document simultaneously without conflicts.

Key constraints:
  - Must work with existing REST API (no full rewrite)
  - Target latency < 200ms for cursor sync
  - Team of 2 engineers, 3-week timeline
  - Must not break offline editing support

Approaches considered:
  1. OT (Operational Transform)
     Pros: battle-tested, well-documented
     Cons: complex server logic, hard to debug
     Risk: implementation complexity exceeds timeline
  2. CRDT (Conflict-free Replicated Data Types)
     Pros: simpler merge semantics, offline-friendly
     Cons: larger payloads, fewer production references
     Risk: performance at scale is unproven for this use case
  3. Lock-based editing with live cursors
     Pros: simplest to implement, low risk
     Cons: poor UX for true simultaneous editing
     Risk: users reject the experience

Top risks:
  1. Timeline risk — OT/CRDT may exceed 3-week budget (high)
     Mitigation: prototype the hardest merge case in week 1
  2. Compatibility risk — offline editing may conflict with sync model (medium)
     Mitigation: map offline editing flows before choosing approach
  3. Performance risk — cursor sync latency target is aggressive (medium)
     Mitigation: benchmark WebSocket round-trip in staging environment

Recommended next step:
  Invoke /sdd-workflow:sdd.specify with this brief as context, focusing on
  the CRDT approach with a week-1 prototype gate.

Unresolved questions:
  - Is WebSocket infrastructure already available in production?
  - What is the maximum concurrent editor count to support?
```
