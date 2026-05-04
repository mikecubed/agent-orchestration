# Track Report — flow-sdd-arch

## Track name

`flow-sdd-arch` — Align Flow architecture review and SDD agents with the
canonical CCC ARCH-1..ARCH-10 ruleset and add composition-first prompts to the
v3 hyphenated SDD workflow.

## Owned tasks

- Align `plugins/flow/skills/arch-review/SKILL.md` with `ARCH-1` through
  `ARCH-10`, treat `ccc/arch-check` as the canonical rule source, and surface
  composition / DI / DIP / ISP / composition-root findings in the architecture
  report. Update verification gates and example output from 6 to 10 rules.
- Add composition-first guidance to the SDD flow agents:
  - `plugins/flow/agents/sdd-specify.md` captures requirements for dependency
    inversion, injected dependencies, justified inheritance, pure domain
    boundaries, and composition-root expectations.
  - `plugins/flow/agents/sdd-plan.md` requires ports/protocols/interfaces,
    consumer-shaped (ISP) interfaces, injected dependencies, an explicit
    composition root, and Clean Architecture / DDD alignment.
  - `plugins/flow/agents/sdd-tasks.md` generates tasks for ports, adapters, DI
    wiring, composition roots, inheritance justification, and a final
    architecture validation step.
- Preserve the v3 hyphenated SDD agent names (`sdd-specify`, `sdd-plan`,
  `sdd-tasks`) and handoffs; do not reintroduce `sdd.specify` / `sdd.plan` /
  `sdd.tasks` or the old `sdd-workflow` plugin.
- Bump the Flow plugin minor version from `3.0.1` to `3.1.0` across the Flow
  manifest surfaces.
- Add tests asserting the new content and the absence of legacy dotted names.

## Owned files

- `plugins/flow/skills/arch-review/SKILL.md`
- `plugins/flow/agents/sdd-specify.md`
- `plugins/flow/agents/sdd-plan.md`
- `plugins/flow/agents/sdd-tasks.md`
- `plugins/flow/package.json`
- `plugins/flow/plugin.json`
- `plugins/flow/.claude-plugin/plugin.json`
- `plugins/flow/test/plugin-layout.test.js`
- `docs/composition-first-track-flow-sdd.md` (this report)

`plugins/flow/skills/sdd-feature/SKILL.md` was reviewed and required no changes
— the activation/handoff text already routes to the v3 hyphenated agents.

## Dependencies

- Upstream CCC track at commit `26c89cd` (`feat(ccc): add composition-first
  architecture rules`) provides the canonical `ARCH-7`..`ARCH-10` definitions
  in `plugins/ccc/skills/arch-check/SKILL.md`. Flow now references that source
  instead of restating the rules.
- No other tracks block this work. Other parallel tracks (root marketplace,
  CCC, patterns) own their own surfaces and are out of scope here.

## Validation commands

- `npm --prefix plugins/flow test`
- Targeted greps:
  - `grep -n "ARCH-1 through ARCH-10\|ARCH-7\|ARCH-8\|ARCH-9\|ARCH-10" plugins/flow/skills/arch-review/SKILL.md`
  - `grep -rn "sdd\.specify\|sdd\.plan\|sdd\.tasks\|sdd-workflow" plugins/flow/agents plugins/flow/skills`
  - `grep -l -i "composition-first\|composition root" plugins/flow/agents/*.md`
  - `ls plugins/flow/agents/`

## Track branch

`wt/composition-flow-sdd`, fast-forwarded to integration commit `26c89cd`
before edits started.

## Worktree path

`/home/mikecubed/projects/agent-orchestration-wt-flow-sdd`

## Current state

- `plugins/flow/skills/arch-review/SKILL.md` evaluates `ARCH-1` through
  `ARCH-10`, names `ccc/skills/arch-check/SKILL.md` as the canonical source,
  emits a dedicated **Composition-First Findings** report subsection, and
  updates its verification checklist and example summary to ten rules.
- `plugins/flow/agents/sdd-specify.md` adds a **Composition-First
  Requirements** section covering dependency inversion, injected
  dependencies, justified inheritance, pure domain boundary, and
  composition-root expectations.
- `plugins/flow/agents/sdd-plan.md` adds a **Composition-First Planning
  Requirements** section requiring ports (DIP/ISP), injected dependencies,
  explicit composition roots, composition over inheritance with justification,
  pure domain logic, and Clean Architecture / DDD alignment, and ties the
  plan's quality gates to `ARCH-1`..`ARCH-10` via `ccc/arch-check`.
- `plugins/flow/agents/sdd-tasks.md` adds a **Composition-First Task
  Generation** section that drives port, adapter, DI wiring, composition root,
  inheritance justification, and arch-validation tasks.
- All three SDD agents retain v3 hyphenated handoffs; no dotted names or
  `sdd-workflow` references reintroduced.
- Flow plugin version bumped to `3.1.0` in `package.json`, `plugin.json`, and
  `.claude-plugin/plugin.json`. Root marketplace files were not touched (out
  of scope for this track).

## Validation outcome

- `npm --prefix plugins/flow test` → 43 tests across 3 suites, all passing
  (baseline was 40; three new tests added by this track).
- New tests assert: arch-review aligns with `ARCH-1 through ARCH-10` and names
  `ccc/arch-check` as canonical, with composition / DI / DIP / ISP /
  composition-root coverage and a 10-rule verification gate; SDD agents
  include composition-first guidance with no dotted names or `sdd-workflow`
  references.
- Targeted greps confirm no legacy dotted SDD names remain under
  `plugins/flow` (matches found are inside the new test assertions that forbid
  them).

## Unresolved issues

- None for this track's owned scope.
- Out of scope and intentionally untouched: root marketplace manifests, CCC
  plugin files, and patterns-plugin files — those belong to other parallel
  tracks per the upgrade plan.

## Revisions

### Round 1 — FLOW-ARCH-001

**Reviewer finding (FLOW-ARCH-001):** `plugins/flow/skills/arch-review/SKILL.md`
still embedded non-canonical ARCH semantics. The skill declared
`ccc/arch-check` canonical and forbade restating rule semantics, but Step 3
("the ten rules and their headline scope") and the example output still
duplicated and risked drifting legacy ARCH-1..ARCH-6 titles such as
`ARCH-1 — Layer violations`, `ARCH-3 — Missing public API declarations`,
`ARCH-4 — Dependency direction violations`, `ARCH-5 — God modules`, and
`ARCH-6 — Missing abstraction boundaries`.

**Changes (round 1):**

- `plugins/flow/skills/arch-review/SKILL.md`:
  - Step 3 no longer enumerates a Flow-specific paraphrase of each rule.
    Instead it instructs the reviewer to pull rule names, severities,
    detection signals, and `agent_action` recommendations directly from
    `plugins/ccc/skills/arch-check/SKILL.md`, the named canonical source, and
    explicitly forbids inventing alternative titles or paraphrased headlines.
  - The example architecture report was rewritten so every rule heading uses
    the canonical CCC name verbatim (e.g. `ARCH-1 — No Outward Imports from
    Domain Layer`, `ARCH-4 — Infrastructure Must Not Leak Into Domain or
    Application`, `ARCH-6 — Explicit Public API Required for Every
    Module/Package`). The example metadata block now records the canonical
    rules source path. Verdicts cite "per canonical severity" / "per
    canonical `agent_action`" instead of restating definitions.
- `plugins/flow/test/plugin-layout.test.js`:
  - Extended the arch-review alignment test to (a) reject each legacy label
    explicitly (`ARCH-1 — Layer violations`,
    `ARCH-3 — Missing public API declarations`,
    `ARCH-4 — Dependency direction violations`, `ARCH-5 — God modules`,
    `ARCH-6 — Missing abstraction boundaries`); (b) require an explicit
    pointer to `plugins/ccc/skills/arch-check/SKILL.md`; and (c) require the
    "do not restate or paraphrase the rule semantics" instruction to remain
    present.

**Validation (round 1):**

- `npm --prefix plugins/flow test` → 43/43 tests pass across 3 suites
  (exit 0). The expanded arch-review test exercises the new legacy-label
  rejections and canonical-source assertion.
- Targeted greps:
  - `grep -nE 'Layer violations|Missing public API declarations|Dependency direction violations|God modules|Missing abstraction boundaries' plugins/flow/skills/arch-review/SKILL.md`
    → no matches (exit 1).
  - `grep -rnE 'sdd\.(specify|plan|tasks)|sdd-workflow' plugins/flow/agents plugins/flow/skills`
    → no matches (exit 1).

**Current state after round 1:**

- `plugins/flow/skills/arch-review/SKILL.md` consumes ARCH-1..ARCH-10 entirely
  by reference to `plugins/ccc/skills/arch-check/SKILL.md`. No paraphrased
  titles or rule definitions remain in the body or the example output. All
  rule headings in the example match canonical CCC names exactly.
- Flow tests (43) all pass and now explicitly guard against the legacy
  ARCH-1..6 labels and against losing the canonical-source instruction.
- Out-of-scope surfaces (root marketplace files, CCC files, patterns files)
  remain untouched.

## Next action

Coordinator should integrate this branch (`wt/composition-flow-sdd`) into the
composition-first integration branch and let the parallel-impl coordinator
update `.agent/SESSION.md` and open or refresh the umbrella PR. No follow-up
work is required from this track.
