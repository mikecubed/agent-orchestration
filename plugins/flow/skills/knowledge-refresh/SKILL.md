---
name: knowledge-refresh
description: Evaluate and maintain previously captured knowledge — classify candidates as trusted, stale, duplicate, obsolete, superseded, or needs-capture — and route maintenance actions through bounded progression modes with durable state updates at each owned phase boundary.
---

> References to plugin documentation files (e.g. `docs/workflow-artifact-templates.md`) refer to the plugin-level `docs/` directory (`../../docs/` relative to this file). Other `docs/` paths (such as artifact output destinations) refer to the target project.

## Purpose

Use this skill when existing knowledge artifacts need maintenance — deduplication,
staleness review, retirement, metadata refresh, or rerouting of missing-capture
gaps back to `knowledge-save`. The skill evaluates a candidate set of
previously captured knowledge, classifies each artifact, applies the appropriate
maintenance action, and records the results in a durable refresh summary.

This skill is a **maintenance** workflow: it operates on knowledge that has
already been captured. It does not perform original investigation, debugging,
or fresh lesson extraction — those belong to the originating workflow or to
`knowledge-save`.

This skill is a thin coordinator. It owns candidate classification, maintenance
action sequencing, progression mode, durable workflow-state updates, and clear
stop boundaries. It does **not** replace `knowledge-save`, planning, review,
debugging, or architecture workflows.

Persistent team, squad, or fleet-style long-lived orchestration is out of scope
for this skill. Use a separate orchestration layer if persistent coordination is
needed.

**Out of scope**: imposing a mandatory global directory taxonomy for knowledge
artifacts, re-running original investigations inside the refresh workflow,
replacing `knowledge-save` with a combined capture-and-maintenance skill,
and performing planning, review, debugging, or architecture work instead of
routing to the existing specialist surface.

## When to Use It

Activate when the developer asks for things like:

- "refresh our knowledge base"
- "check for stale or duplicate knowledge artifacts"
- "clean up old knowledge entries"
- "deduplicate the knowledge from those debugging sessions"
- "retire outdated knowledge and keep the canonical entries"

Also activate when:

- a conductor workflow recommends refresh after a significant completion event;
- a planning or review lookup surfaces stale, duplicate, or conflicting
  knowledge artifacts;
- the developer flags a knowledge candidate set as needing maintenance;
- a post-delivery retrospective identifies knowledge artifacts whose
  applicability or guardrails no longer match current repository reality.

Do **not** activate for:

- capturing knowledge from a workflow that just completed (use
  `knowledge-save`);
- general documentation or README updates (use normal editing);
- architecture decision records (use `arch-review`);
- codebase orientation (use `map-codebase`).

## Project-Specific Inputs

Before you start, identify:

- **refresh scope** — the knowledge candidate set to evaluate. This may be an
  explicit list of artifact paths, a directory or sink to scan, or a topic area
  the developer wants refreshed;
- **knowledge sink** — the repository location where knowledge artifacts live.
  When shared workflow defaults (see `docs/workflow-defaults-contract.md`)
  declare a knowledge-capture sink, use that configured path as the primary
  discovery location. When the developer provides an explicit scope, the
  developer's choice overrides any configured default. When neither is
  available, ask before proceeding;
- **progression mode** — `manual`, `guided`, or `auto` (see § Resolve
  progression mode);
- **source references** — optional links or paths to triggering context such
  as a conductor summary, a planning brief, or a review report that motivated
  the refresh;
- **sink authority** — whether the repository has a clear canonical sink owner
  or convention for knowledge artifacts. If no sink authority is discoverable,
  the workflow must stop before destructive actions;
- whether durable workflow state exists at `.flow/state.json`
  (see `docs/workflow-state-contract.md`);
- whether shared workflow defaults exist at
  `.flow/defaults.json` (see
  `docs/workflow-defaults-contract.md`).

## Workflow

### 1. Build the refresh intake and verify context

Before classifying candidates, verify the refresh request has enough context:

1. Confirm the knowledge sink is discoverable — either from shared workflow
   defaults, from the developer's explicit scope, or from repository
   conventions.
2. Inventory the candidate set — list the knowledge artifacts to evaluate. When
   the scope is a directory or sink, scan for artifacts matching the knowledge
   artifact shape from `docs/workflow-artifact-templates.md`.
3. Create or reuse one factual brief capturing:
   - the refresh scope;
   - the candidate count and artifact paths;
   - the triggering context (conductor summary, planning brief, or developer
     request);
   - the current sink convention;
   - open questions about scope or authority.

If the candidate set is empty or the sink is undiscoverable, stop with an
explicit explanation.

**Update `.flow/state.json`** — write state at the
`refresh-assessing` boundary (see § State update matrix).

### 2. Resolve progression mode

The refresh workflow supports exactly three progression modes:

| Mode | Meaning | Default behavior |
| --- | --- | --- |
| `manual` | step-by-step control | stop before every classification decision and every maintenance action; wait for explicit developer confirmation |
| `guided` | bounded automation with explicit stop points | continue through safe classification and non-destructive updates, but stop at documented human gates |
| `auto` | highest automation allowed by current guardrails | continue through all safe boundaries until a documented hard stop or completion |

Resolve the active mode using this precedence order:

1. explicit developer input for the current invocation;
2. trusted same-lifecycle workflow-state continuity, when the current run is
   part of an active refresh lifecycle and the state is not stale;
3. `.flow/defaults.json` (`automation.progression`);
4. local fallback to `manual`.

Record the resolved mode in the durable state and in the refresh summary.

### 3. Classify candidates

For each knowledge artifact in the candidate set, evaluate against these
classification outcomes:

| Classification | Meaning | Allowed maintenance actions |
| --- | --- | --- |
| `trusted` | accurate, current, and non-duplicated | no action required; optionally refresh metadata (timestamps, source links) |
| `stale` | content or guardrails no longer match current repository reality | rewrite affected fields, retire if unrepairable, or stop for human guidance |
| `duplicate` | substantially overlaps another artifact in the same candidate set or sink | merge into one canonical artifact and retire the duplicate, or stop for human guidance when the canonical winner is ambiguous |
| `obsolete` | the problem, technology, or context no longer exists in the repository | retire or archive the artifact; record the obsolescence reason |
| `superseded` | a newer, more complete artifact already covers the same lesson | record the supersession relationship and retire the older artifact |
| `needs-capture` | a gap in coverage — the candidate set reveals a reusable lesson that should exist but has not been captured | route to `/flow:knowledge-save` for fresh capture; do not fabricate knowledge inside the refresh workflow |

Classification rules:

- Evaluate each artifact's Problem, Signals, Resolution, Guardrails,
  Applicability, and Source references against the current repository state.
- When two or more artifacts describe the same failure shape with overlapping
  applicability, classify the best candidate as `trusted` (or `stale` if it
  also needs updates) and the others as `duplicate` or `superseded`.
- When a candidate looks like an architecture decision, policy change, or README
  guidance update rather than reusable operational knowledge, route to
  `/flow:arch-review` instead of classifying it.
- When a candidate is still accurate but missing required metadata (guardrails,
  source references), classify as `stale` with a metadata-refresh action rather
  than `obsolete`.

Present the full candidate classification to the developer before proceeding
to maintenance actions. In `manual` mode, stop after classification for
explicit confirmation. In `guided` mode, continue only when all classifications
are unambiguous. In `auto` mode, continue unless an ambiguous or destructive
boundary is reached.

**Update `.flow/state.json`** — write state at the
`refresh-candidates-confirmed` boundary.

### 4. Plan maintenance actions

For each classified candidate, determine the concrete maintenance action:

- **trusted** — optionally refresh metadata; no structural changes.
- **stale** — draft updated fields (Guardrails, Applicability, Source
  references) based on current repository evidence. Do not rewrite the core
  Resolution unless the fix itself has changed.
- **duplicate** — identify the canonical winner, draft a merged artifact, and
  mark the retired artifact with a supersession pointer.
- **obsolete** — mark as retired with an obsolescence reason.
- **superseded** — record the supersession relationship and mark as retired.
- **needs-capture** — prepare a capture request for
  `/flow:knowledge-save` with the gap description and
  available evidence.

Present the maintenance plan for developer review. In `manual` mode, stop and
wait for explicit approval. In `guided` mode, continue for safe non-destructive
updates but stop at destructive boundaries (see § Human-stop boundaries). In
`auto` mode, continue unless a human-stop boundary is reached.

**Update `.flow/state.json`** — write state at the
`refresh-planned` boundary.

### 5. Execute maintenance actions

Apply the approved maintenance actions:

1. Write updated metadata for `stale` artifacts.
2. Write merged canonical artifacts for `duplicate` resolutions. Update or
   retire the duplicates with supersession pointers.
3. Retire `obsolete` and `superseded` artifacts with recorded reasons.
4. Route `needs-capture` gaps to `/flow:knowledge-save`.

After each action, confirm the write succeeded. If a write fails, report the
failure and apply the rescue policy.

**Update `.flow/state.json`** — write state at the
`refresh-updating` boundary.

### 6. Validate refresh results

After maintenance actions are complete:

1. Verify that every classified candidate has a recorded maintenance outcome.
2. Verify that canonical artifacts are accessible and well-formed.
3. Verify that retired artifacts are marked with supersession or retirement
   metadata.
4. Check that prior-learning lookup from planning and review consumers would
   now prefer the refreshed canonical artifacts and suppress retired duplicates.

**Update `.flow/state.json`** — write state at the
`refresh-validating` boundary.

### 7. Produce the durable refresh summary

At workflow completion — or at any hard stop that leaves a durable handoff —
emit one durable refresh summary using the `Refresh summary` template in
`docs/workflow-artifact-templates.md`.

The summary must record:

- the refresh scope and candidate count;
- each candidate's classification and maintenance outcome;
- affected knowledge artifacts (canonical, retired, routed);
- unresolved questions or ambiguities;
- next action;
- a pointer to the final `.flow/state.json` snapshot.

When shared workflow defaults declare an artifact sink, use that configured path
as the default destination. For local durable artifacts in this repository, prefer
`.flow/artifacts/refresh-summary-<topic>.md`. If another durable sink is more appropriate,
preserve the same field structure.

**Update `.flow/state.json`** — write state at the
`refresh-complete` or `refresh-partial` boundary.

### Rescue policy

When the refresh workflow stalls — candidate classification is ambiguous,
maintenance actions fail, or evidence is insufficient:

1. narrow the candidate scope to the unambiguous subset;
2. drop to a more conservative progression mode;
3. retry once with the smaller scope;
4. if rescue fails, stop with a durable partial summary that records the
   stalled candidates and the reason.

### Human-stop boundaries

The following boundaries always require human confirmation regardless of the
active progression mode:

- destructive retirement of a knowledge artifact that is still referenced by
  active planning or review consumers;
- ambiguous duplicate resolution where no clear canonical winner exists;
- merge decisions that would combine artifacts with conflicting guardrails or
  applicability;
- any maintenance action that would modify a knowledge artifact owned by
  another active workflow;
- explicit developer stop request.

### State update matrix

| Boundary | Status | Current phase | Minimum durable references | Next-action rule |
| --- | --- | --- | --- | --- |
| Refresh requested | `active` | `refresh-assessing` | triggering context (conductor summary, explicit request, or consumer lookup note) | inventory knowledge candidates and confirm sink context |
| Candidate set confirmed | `active` | `refresh-candidates-confirmed` | candidate inventory or refresh intake summary | classify candidates |
| Refresh plan accepted | `planned` or `active` | `refresh-planned` | candidate inventory plus planned maintenance decisions | apply safe updates, merges, retirements, or reroutes |
| Refresh updates in progress | `active` | `refresh-updating` | affected knowledge artifacts plus target canonical or retired references | persist refreshed artifacts and update supersession links |
| Reuse quality validation running | `active` | `refresh-validating` | refreshed artifacts plus refresh summary draft | validate downstream lookup expectations and finalize summary |
| Refresh blocked by ambiguity or policy | `blocked` | `refresh-blocked` | blocker reason plus candidate references | wait for human confirmation, narrower scope, or reroute |
| Refresh state is stale or unsupported | `stale` or `blocked` | `refresh-state-stale` | stale-state reason plus last trusted refresh references | stop unsafe progression and require state regeneration or human confirmation |
| Refresh complete | `complete` | `refresh-complete` or `refresh-partial` | final refresh summary plus updated canonical knowledge references | recommend downstream planning/review reuse or return to conductor |

Every boundary write MUST include the required fields from
`docs/workflow-state-contract.md`: `schema-version`, `workflow`, `updated-at`,
`status`, `current-phase`, `automation-mode`, `next-action`, and durable
artifact references. `workspace` and `owner` SHOULD be written whenever known.

## Required Gates

A refresh run is not complete until:

- the candidate set was inventoried and classified;
- the progression mode was resolved and recorded;
- maintenance actions were applied or explicitly deferred with a recorded reason;
- `.flow/state.json` was updated at every meaningful
  refresh-owned phase boundary;
- every downstream routing remained delegated to the existing specialist
  workflow rather than being reimplemented inside the refresh coordinator;
- a durable refresh summary or explicit blocked handoff summary was produced.

### Verification checklist — refresh complete

Before declaring the refresh pass complete, confirm ALL of the following:

- [ ] Candidate set inventoried and each artifact classified — PASS / FAIL
- [ ] Progression mode resolved and recorded — PASS / FAIL
- [ ] Maintenance actions applied or deferred with reason — PASS / FAIL
- [ ] State writes occurred only at refresh-owned phase boundaries — PASS / FAIL
- [ ] Missing-capture gaps routed to `knowledge-save`, not fabricated — PASS / FAIL
- [ ] Architecture-shaped candidates routed to `arch-review` — PASS / FAIL / N/A
- [ ] Durable refresh summary produced — PASS / FAIL

If any item is FAIL: surface the failing item, state the required next action,
and do not declare the refresh complete.

## Stop Conditions

- The candidate set is empty — no knowledge artifacts to evaluate.
- The knowledge sink is undiscoverable and the developer cannot provide one.
- Evidence is insufficient to classify candidates after asking the developer
  for clarification.
- Ambiguous duplicate resolution cannot be narrowed after rescue.
- A destructive retirement requires human approval that has not been given.
- Durable workflow state is stale, malformed, unsupported, or owned by another
  workflow in a way that makes auto-progression unsafe.
- Sink authority is missing and the planned action is destructive.
- The developer asks to stop.

Before stopping, ensure any partial refresh summary is produced so the work
is not lost. A rescue attempt consists of narrowing the candidate scope,
dropping to a more conservative mode, or asking the developer for the missing
evidence.

## Example

### Guided refresh of a knowledge directory

```text
Developer: /flow:knowledge-refresh refresh the knowledge
artifacts in docs/knowledge/ in guided mode

Coordinator:
  Refresh scope: docs/knowledge/
  Knowledge sink: docs/knowledge/ (from shared defaults)
  Progression mode: guided
  Candidates: 5 knowledge artifacts found

  Classification:
    1. ci-auth-seed-ordering.md — trusted (current, no duplicates)
    2. flaky-retry-timeout.md — stale (guardrails reference removed dependency)
    3. api-rate-limit-backoff.md — duplicate (overlaps #4)
    4. rate-limit-retry-pattern.md — duplicate (overlaps #3, more complete)
    5. legacy-xml-parser-fix.md — obsolete (XML parser removed in v3.0)

  Canonical winners:
    - #4 (rate-limit-retry-pattern.md) selected over #3
  Maintenance plan:
    - #1: no action
    - #2: refresh guardrails to remove stale dependency reference
    - #3: retire with supersession pointer to #4
    - #4: merge relevant details from #3, mark as canonical
    - #5: retire with obsolescence reason

  → Continuing through safe updates (guided mode)...
  → Stopping at: retire #3 (destructive — requires confirmation)

Developer: confirmed, retire #3

  → Retirement recorded. Continuing...
  → All maintenance actions applied.
  → Refresh summary written to .flow/artifacts/refresh-summary-knowledge-cleanup.md

  Durable state updated at:
    - refresh-assessing
    - refresh-candidates-confirmed
    - refresh-planned
    - refresh-updating
    - refresh-validating
    - refresh-complete

  Next action:
    Planning and review lookups will now prefer the refreshed canonical
    artifacts. No further action required.
```
