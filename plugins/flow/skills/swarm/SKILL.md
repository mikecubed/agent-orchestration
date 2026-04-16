---
name: swarm
description: Dynamically decompose complex work into adaptive agent swarms with shared context, topology selection, and convergence gates.
---

## Purpose

Use this skill when a developer needs to execute work that is too large, too structurally uncertain, or too interdependent for a fixed parallel-implementation pattern. Swarm orchestration differs from parallel-impl in one critical way: **the task decomposition and agent topology are decided at runtime by a coordinator**, not pre-defined by a plan.

This is an escalation skill. Reach for it only after simpler patterns — scout-then-implement, parallel tracks, or wave/batch execution — have proven insufficient. The coordinator must justify the escalation to the developer before spawning the swarm.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope for this skill. Use a separate orchestration layer if persistent coordination is needed.

## When to Use It

Activate when the developer asks for things like:

- "break this down and figure out the best way to attack it"
- "coordinate a swarm of agents on this"
- "I don't know exactly how to divide the work — you figure it out"
- "this is too big for a single parallel run"

Also activate when:

- the scope is large enough that decomposition itself is non-trivial;
- the work has emergent coupling discovered only after partial exploration;
- multiple specializations (e.g., architecture review, deep implementation, security audit) are needed concurrently on the same codebase;
- intermediate results from one agent must influence the scope of another before the batch is complete.

Do **not** activate for work that already has a clear task list, fixed boundaries, and no cross-agent dependencies — use `parallel-impl` or `plan` instead.

## Project-Specific Inputs

Before you start, identify:

- the high-level goal or change request in plain language;
- the repository's validation commands and quality gates;
- the integration branch and final review target;
- where durable artifacts should live (default: `docs/` or `.copilot/swarm/`);
- the developer's risk tolerance and token budget preference (`minimal`, `standard`, or `deep`);
- whether the repository permits temporary scratch files (e.g., `SWARM.md`) during execution;
- any constraints on agent count or concurrency;
- the maximum convergence rounds before escalation (default: 2).

If any of those inputs are missing, stop and get them before spawning any agents.

## Default Roles

Use separate roles for:

- a **coordinator** (the active session — owns the SWARM.md knowledge base, decides topology, runs convergence checks);
- a **scout** that explores and produces a factual brief before any decomposition occurs;
- **domain agents** (1-N, dynamically spawned) that each own a bounded sub-problem;
- a **synthesizer** that integrates domain agent outputs into a coherent whole;
- a **reviewer** that reviews the synthesized result independently of all other roles.

The coordinator shares the SWARM.md factual brief with all agents. The coordinator does **not** share one agent's conclusions or assessments with another agent before synthesis; only factual context (file lists, task boundaries, validation commands, known dependencies) flows between roles.

### Token Budget by Mode

| Mode       | Relative cost | When to use |
|------------|---------------|-------------|
| `minimal`  | 1x            | Well-scoped work, narrow goal, few agents |
| `standard` | 2–2.5x        | Normal swarm; 3-5 domain agents + review  |
| `deep`     | 3x+           | Architectural unknowns, full-system impact |

Always confirm the budget mode with the developer before starting `standard` or `deep` runs.

### Model Selection

Resolve the active model for each role using this priority chain:

1. **Project config** — look for the runtime-specific config file in the current project root:
   - Copilot CLI: `.copilot/models.yaml`
   - Claude Code: `.claude/models.yaml`

   Read the `coordinator`, `scout`, `domain`, `synthesizer`, and `reviewer` keys directly. Absent keys fall back to baked-in defaults.

2. **Session cache** — if models were confirmed earlier in this session, reuse
   them without asking again.
3. **Baked-in defaults** — if neither config file nor session cache exists, use
   the defaults below silently without prompting. Create project model config
   only when the developer wants persistent overrides.

#### Config file format

```yaml
coordinator: <model-name>
scout: <model-name>
domain: <model-name>
synthesizer: <model-name>
reviewer: <model-name>
```

#### Default models

| Runtime     | Role         | Default model      |
|-------------|--------------|-------------------|
| Copilot CLI | Coordinator  | `claude-sonnet-4.6` |
| Copilot CLI | Scout        | `claude-haiku-4.5`  |
| Copilot CLI | Domain       | `claude-opus-4.6`   |
| Copilot CLI | Synthesizer  | `claude-opus-4.6`   |
| Copilot CLI | Reviewer     | `gpt-5.4`           |
| Claude Code | Coordinator  | `claude-sonnet-4.6` |
| Claude Code | Scout        | `claude-haiku-4.5`  |
| Claude Code | Domain       | `claude-opus-4.6`   |
| Claude Code | Synthesizer  | `claude-opus-4.6`   |
| Claude Code | Reviewer     | `claude-opus-4.6`   |

Use the cheapest capable model for scout and coordinator (navigation/routing). Reserve the most capable model for domain agents working on architecture or security tasks, and for the synthesizer integrating their outputs.

## SWARM.md: The Shared Knowledge Base

Before spawning any domain agent, the coordinator creates a `SWARM.md` file in the repository-appropriate scratch location (e.g., `.copilot/swarm/SWARM.md` or a temp path). This file is the **single shared source of factual context** for the entire swarm run.

### Required SWARM.md fields

```text
Goal: <one-sentence description of the overall objective>
Mode: minimal | standard | deep
Budget: <token budget confirmation or 'pending'>
Integration branch: <branch name>
Validation commands: <command>, <command>
Artifact sink: <path where durable artifacts are written>

## Agent Registry
| Agent ID | Domain       | Owned files/modules | Status   |
|----------|--------------|---------------------|----------|
| agent-01 | <domain>     | <files>             | pending  |

## Shared Facts
<Factual context from the scout: relevant files, interfaces, known dependencies, open questions>

## Topology
<Chosen topology: coordinator-worker | pipeline | wave | hierarchical | mesh>
<Justification for the topology choice>

## Convergence Log
<Round-by-round notes: what converged, what diverged, what was escalated>
```

Update SWARM.md after every convergence check. Delete or archive it after the swarm run completes successfully. Do not leave SWARM.md as a permanent repository artifact.

## Core Rules

### 1. Decompose at runtime, not in advance

The coordinator must read the repository's actual state before deciding on domain boundaries. Do not copy a pre-existing plan's task list directly into the swarm topology — scout first, then decompose based on what is actually there.

### 2. Keep domain agent scope bounded and non-overlapping

Each domain agent must:
- own a clear, non-overlapping set of files or modules;
- have explicit validation commands;
- stay within its scope boundary;
- report partial results if blocked rather than expanding scope silently.

If two domain agents discover they share a boundary mid-run, the coordinator must adjudicate before either agent proceeds.

### 3. Synthesis is a dedicated step, not a side effect

Integration of domain agent outputs must go through a dedicated synthesizer role. Do not allow domain agents to merge their own work. The synthesizer is responsible for:
- resolving interface conflicts between domains;
- detecting gaps that no domain covered;
- producing a coherent unified result;
- flagging residual ambiguities for the reviewer.

### 4. TDD stays mandatory on every code-bearing domain

Each domain agent that writes code must:
1. add or update failing tests first when behavior changes;
2. implement only enough to make the tests pass;
3. refactor while tests remain green.

Do not allow implementation-first drift in domain agents.

### 5. Convergence rounds are bounded

The coordinator runs at most the number of convergence rounds specified in Project-Specific Inputs (default: 2). Each round:
1. collects domain agent results;
2. checks for completeness gaps, interface conflicts, and boundary violations;
3. re-spawns targeted agents for specific gaps only — not a full re-run;
4. updates SWARM.md convergence log.

If full convergence is not reached within the maximum rounds, escalate to the developer with a summary of remaining gaps before proceeding.

## Workflow

### 1. Justify and confirm escalation

Before doing any work:
1. briefly explain why simpler patterns (parallel-impl, plan) are insufficient for this goal;
2. state the proposed topology and budget mode;
3. ask the developer to confirm before spawning the swarm.

### 2. Scout and populate SWARM.md

Dispatch the scout to produce a factual brief covering:
- relevant files and modules;
- known dependencies and shared interfaces;
- validation commands;
- open questions requiring developer input.

Create SWARM.md with the output. Do not proceed until the developer resolves any open questions flagged by the scout.

### 3. Select topology and decompose

Based on the scout brief and the goal shape, choose one topology:

| Topology            | Use when |
|---------------------|----------|
| Coordinator-worker  | Independent domains, no cross-agent dependencies |
| Pipeline            | Strict ordering; output of one agent feeds the next |
| Wave/batch          | Dependency graph known; parallel execution by wave |
| Hierarchical        | Sub-coordinators needed for large domains |
| Mesh (emergent)     | Only when inter-agent communication is unavoidable |

Record the topology choice and justification in SWARM.md. Prefer the simplest topology that achieves the goal.

Decompose the goal into domain agents. For each agent, record in SWARM.md:
- agent ID;
- domain name;
- owned files or modules;
- validation commands;
- dependencies on other agents;
- status (`pending`, `active`, `complete`, `blocked`, `stopped`).

### 4. Spawn domain agents

For each domain agent:
1. provide the agent with:
   - the SWARM.md factual context (shared facts section only);
   - its owned domain, files, and validation commands;
   - TDD expectations;
   - scope boundary — it must not touch files outside its domain;
   - instruction to report blockers immediately rather than expanding scope;
2. track agent status in SWARM.md;
3. monitor for progress using the same stall policy as parallel-impl (soft budget → stall evidence → same-agent rescue/escalation → hard budget → stopped).

### 5. Coordinator rescue policy

If a domain agent stalls before completing:
1. request a brief status and blockers from the current domain agent;
2. prefer same-agent continuation in the same domain and context first;
3. narrow scope only when the current assignment can no longer finish safely as scoped;
4. do **not** spawn a second rescue domain agent or duplicate the same scope by default;
5. if continuation fails, mark the agent `stopped` in SWARM.md, record partial results and unresolved items, and flag the gap for the convergence check.

Do not re-spawn a failed domain agent with the same or only slightly narrower scope by default. Continue in place first, and escalate if the current agent still cannot progress.

### 6. Run convergence checks

After all domain agents complete or stop:
1. collect all results;
2. check for:
   - completeness gaps (sub-problems no agent covered);
   - interface conflicts (two agents made incompatible assumptions about a shared contract);
   - boundary violations (an agent touched files outside its domain);
   - TDD violations (code-bearing agents that did not write tests first);
3. for each gap or conflict, try targeted reconciliation through the existing responsible agent or synthesizer context first; spawn a new reconciliation agent only when there is one sharply bounded unresolved interface gap and no current owner can safely continue;
4. update SWARM.md convergence log;
5. if full convergence is not reached within the maximum rounds, escalate to the developer.

### SESSION.md write — topology phase converged

At this gate (per topology phase, after convergence is reached or escalated), write
`.agent/SESSION.md`. Record:
- `current-task`: the overall swarm goal description
- `current-phase`: "phase-[N]-converged" (substitute the phase name or number)
- `next-action`: "begin next topology phase or run swarm completion gate"
- `workspace`: the active branch or PR reference
- `last-updated`: current ISO-8601 datetime
- `## Decisions`: convergence decisions — resolved gaps, escalated conflicts, topology adjustments
- `## Files Touched`: files touched by domain agents in this phase
- `## Open Questions`: interface conflicts or gaps escalated to the developer
- `## Blockers`: active blockers (empty if none)
- `## Failed Hypotheses`: hypotheses tried and ruled out during reconciliation

If the write fails: log a warning and continue. Do not block convergence completion.

### 7. Synthesize

Dispatch the synthesizer with:
- all domain agent results;
- the SWARM.md shared facts;
- explicit instruction to integrate without introducing new features or scope.

The synthesizer must produce:
- a unified result (code, plan, analysis, or artifact depending on the goal);
- a list of residual ambiguities or gaps it could not resolve;
- validation it ran.

### 8. Review the synthesis

Send only the synthesized result to the reviewer. The reviewer must not see domain agent intermediate outputs or the SWARM.md convergence log — only the final synthesis and the original goal statement.

Ask the reviewer for only substantive issues:
- correctness bugs;
- missing coverage;
- interface gaps;
- scope violations.

### 9. Revise if needed

If the reviewer finds real issues, return them to the synthesizer as a targeted resend:
- unresolved issue IDs;
- constrained scope (no new features);
- acceptance criteria;
- validation commands.

Limit resend to one round. If the same issue survives one resend, escalate to the developer rather than continuing the loop.

### 10. Finalize and clean up

After the synthesis is accepted:
1. run the repository's full quality gates;
2. invoke `/flow:pr-ready` on the stable diff;
3. produce a durable swarm summary artifact (see template below);
4. delete or archive SWARM.md from the scratch location;
5. retire any temporary work surfaces.

### Swarm summary artifact

```text
Goal: <original goal statement>
Topology used: <topology>
Mode: <minimal | standard | deep>
Domain agents: <count>
Convergence rounds: <count>
Agents stopped: <count with reason>
Rescue attempts: <count>
Synthesis gaps resolved: <count>
Review issues: <count unresolved>
Validation: <pass | fail | skipped>
Final outcome: <merged | blocked | abandoned | partially delivered>
Residual follow-ups: <items requiring future work>
```

Write this artifact to the repository-appropriate durable sink — PR description, committed doc, issue comment, or task tracker entry. Chat-only memory is not sufficient.

## Required Gates

### Domain agent gate

A domain agent is not complete until:
- tests were added or updated first when applicable;
- domain-local validation passes;
- changed files stayed within the agent's scope boundary;
- partial results (if stopped early) are recorded in SWARM.md.

### Swarm convergence gate

The swarm is not ready for synthesis until:
- all completeness gaps and interface conflicts are resolved or escalated;
- all boundary violations are adjudicated;
- SWARM.md convergence log reflects the current state.

### Synthesis gate

The synthesis is not complete until:
- the synthesized result is coherent and non-contradictory;
- residual ambiguities are explicitly listed;
- synthesis-level validation passes.

### Final gate

The swarm run is not complete until:
- review found no unresolved substantive issues;
- repository quality gates pass;
- final readiness workflow ran on the stable diff;
- the durable swarm summary artifact has been produced;
- SWARM.md has been deleted or archived from the scratch location.

### Verification checklist — swarm run complete

Before declaring the swarm run done, confirm ALL of the following.

- [ ] A durable swarm summary artifact was produced and committed to the appropriate sink — PASS / FAIL
- [ ] Every agent track either converged successfully OR was explicitly abandoned with a
  recorded reason in the swarm summary — PASS / FAIL
  (A track with no convergence record and no abandonment record is a failing item.)
- [ ] SWARM.md has been deleted or archived — PASS / FAIL
- [ ] Repository quality gates ran and passed on the synthesized result — PASS / FAIL

If any item is FAIL: surface the failing item, state what must be resolved,
and do not advance to "done."

## Stop Conditions

- the developer declines to confirm escalation;
- scout discovers that the goal is narrower than expected — fall back to a simpler pattern;
- convergence rounds exceed the maximum without resolving critical gaps;
- rescue fails for a domain that is on the critical path;
- synthesis cannot resolve a fundamental interface conflict after one resend;
- review issues survive one resend round;
- scope growth during synthesis indicates a planning gap;
- token budget would be exceeded without delivering meaningful partial value;
- the developer asks to stop.

When stopping, record partial results, resolved sub-problems, unresolved gaps, and the reason for stopping in the swarm summary artifact before releasing any work surfaces.

## Example

```text
Goal: Audit and harden the authentication subsystem across API, session management, and token validation.
Mode: standard
Topology: coordinator-worker (3 independent domains)
Scout brief: auth/ contains 12 files, 3 clear domain boundaries (api-auth, session, token). Shared interface: UserCredential type in src/auth/types.ts.
Domain agents:
  agent-01  api-auth        src/auth/api/         npm test -- test/auth/api/
  agent-02  session-mgmt    src/auth/session/      npm test -- test/auth/session/
  agent-03  token-validation src/auth/token/       npm test -- test/auth/token/
Convergence round 1: agent-01 and agent-03 both modified UserCredential. Coordinator adjudicated — agent-01 owns the type, agent-03 imports. One targeted reconciliation agent spawned.
Convergence round 2: all gaps resolved. Proceeding to synthesis.
Synthesis: unified result with 0 interface conflicts, 1 residual gap (refresh token edge case) flagged for follow-up.
Review: 2 substantive issues found, both resolved in one resend.
Final validation: passes. PR opened.
```
